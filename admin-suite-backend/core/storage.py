import os
import logging
import cloudinary
import cloudinary.uploader
from django.core.files.uploadedfile import UploadedFile
from cloudinary_storage.storage import MediaCloudinaryStorage

logger = logging.getLogger(__name__)


class UniversalMediaCloudinaryStorage(MediaCloudinaryStorage):
    """
    Intelligent Cloudinary storage backend for Django that dynamically routes
    uploads based on the file type:
    - Images: resource_type='image'
    - Audio/Video (voice notes, m4a, mp3, mp4, etc.): resource_type='video'
      (Cloudinary manages all audio streams under the 'video' resource namespace)
    - Documents & other files (pdf, docx, txt, xlsx, zip, etc.): resource_type='raw'

    Provides graceful fallback to 'raw' if Cloudinary encounters strict MIME mismatch,
    and ensures correct extension preservation so audio and video URLs resolve with 200 OK.
    """

    def _get_resource_type(self, name):
        ext = os.path.splitext(name)[1].lower()
        if ext in ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff'):
            return 'image'
        if ext in (
            '.mp4', '.mov', '.avi', '.mkv', '.webm',
            '.m4a', '.mp3', '.wav', '.aac', '.ogg', '.flac', '.3gp', '.amr'
        ):
            return 'video'
        if ext in ('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.csv'):
            return 'raw'
        # Heuristic if extension was stripped in legacy records
        base = os.path.basename(name).lower()
        if 'voice_' in base or 'audio_' in base or 'video_' in base:
            return 'video'
        if 'photo_' in base or 'image_' in base or 'img_' in base:
            return 'image'
        return 'raw'

    def _save(self, name, content):
        name = self._normalise_name(name)
        name = self._prepend_prefix(name)
        content = UploadedFile(content, name)
        response = self._upload(name, content)
        public_id = response['public_id']
        ext = os.path.splitext(name)[1].lower()
        fmt = response.get('format')
        # Preserve file extension in stored name so future URL generation knows format & resource type
        target_ext = f".{fmt}" if fmt else ext
        if target_ext and not public_id.lower().endswith(target_ext.lower()):
            return f"{public_id}{target_ext}"
        return public_id

    def _get_url(self, name):
        name = self._prepend_prefix(name)
        res_type = self._get_resource_type(name)
        ext = os.path.splitext(name)[1].lower()
        # For Cloudinary video/audio, if extension is missing, append format
        if not ext and res_type == 'video':
            name = f"{name}.mp4"
        cloudinary_resource = cloudinary.CloudinaryResource(name, default_resource_type=res_type)
        return cloudinary_resource.url

    def _upload(self, name, content):
        res_type = self._get_resource_type(name)
        options = {
            'use_filename': True,
            'resource_type': res_type,
            'tags': self.TAG,
        }
        folder = os.path.dirname(name)
        if folder:
            options['folder'] = folder

        try:
            return cloudinary.uploader.upload(content, **options)
        except Exception as err:
            logger.warning(
                f"[CloudinaryStorage] Upload for '{name}' with resource_type='{res_type}' failed: {err}. Retrying with 'raw'."
            )
            try:
                if hasattr(content, 'seek'):
                    content.seek(0)
                options['resource_type'] = 'raw'
                return cloudinary.uploader.upload(content, **options)
            except Exception as final_err:
                logger.error(f"[CloudinaryStorage] Fallback upload also failed: {final_err}")
                raise final_err
