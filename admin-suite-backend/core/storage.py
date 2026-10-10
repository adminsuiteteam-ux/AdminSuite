import os
import logging
import cloudinary.uploader
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
    preventing 500 server crashes on media uploads.
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
        return 'raw'

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
