import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const RECENT_STORAGE_KEY = "@adminsuite_recent_emojis_v2";

const DEFAULT_RECENTS = [
  "✋", "🖐️", "❤️", "😂", "🙂", "🥲", "🫦", "😐",
  "👍", "📸", "✨", "🙃", "🥰", "☝️", "😁", "😩",
  "🔪", "🤧", "🗡️", "💔", "🥹", "🥺", "🤝", "😭",
  "🤭", "😹", "💼", "🍑", "🍆", "🤨", "✌️", "🙏",
  "🫣", "💯", "🫡", "👊"
];

const EMOJI_CATEGORIES = [
  {
    id: "recents",
    name: "Recents",
    iconType: "feather" as const,
    iconName: "clock",
    emojis: [] as string[],
  },
  {
    id: "smileys",
    name: "Smileys & People",
    iconType: "feather" as const,
    iconName: "smile",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "☺️", "😊",
      "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋",
      "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏",
      "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺",
      "😢", "😭", "😮‍💨", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱",
      "😨", "😰", "😥", "😓", "🫣", "🫢", "🫡", "🤫", "🫠", "🤥", "😶", "😐",
      "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪",
      "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠",
      "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖",
      "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "👋", "🤚",
      "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞",
      "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎",
      "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️",
      "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "👀", "👁️",
      "👅", "👄", "🫦", "👶", "👧", "🧒", "👦", "👩", "🧑", "👨", "👩‍🦱", "👨‍🦱",
      "👩‍🦰", "👨‍🦰", "👱‍♀️", "👱‍♂️", "👩‍🦳", "👨‍🦳", "👩‍🦲", "👨‍🦲", "🧔", "👵", "🧓", "👴"
    ],
  },
  {
    id: "nature",
    name: "Animals & Nature",
    iconType: "mci" as const,
    iconName: "paw",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁",
      "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦",
      "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝",
      "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️",
      "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀",
      "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍",
      "🦧", "🦣", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐂",
      "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺",
      "🐈", "🐈‍⬛", "🪶", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇",
      "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔", "🌲", "🌳",
      "🌴", "🪵", "🌱", "🌿", "☘️", "🍀", "🎍", "🪴", "🎋", "🍃", "🍂", "🍁",
      "🍄", "🌾", "💐", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝",
      "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "🌙",
      "🌎", "🌍", "🌏", "🪐", "💫", "⭐️", "🌟", "✨", "⚡️", "☄️", "💥", "🔥",
      "🌪️", "🌈", "☀️", "🌤️", "⛅️", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️",
      "❄️", "☃️", "⛄️", "🌬️", "💨", "💧", "💦", "🫧", "☔️", "☂️", "🌊", "🌫️"
    ],
  },
  {
    id: "food",
    name: "Food & Drink",
    iconType: "mci" as const,
    iconName: "coffee",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒",
      "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️",
      "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖",
      "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴",
      "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗",
      "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤",
      "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧",
      "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜",
      "🍯", "🥛", "🍼", "🫖", "☕️", "🍵", "🧃", "🥤", "🧋", "🫗", "🍶", "🍺",
      "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊", "🥄", "🍴", "🍽️"
    ],
  },
  {
    id: "activity",
    name: "Activities",
    iconType: "mci" as const,
    iconName: "soccer",
    emojis: [
      "⚽️", "🏀", "🏈", "⚾️", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓",
      "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳️", "🪁", "🏹", "🎣", "🤿",
      "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂",
      "🏋️‍♂️", "🏋️‍♀️", "🤼‍♂️", "🤼‍♀️", "🤸‍♂️", "🤸‍♀️", "⛹️‍♂️", "⛹️‍♀️", "🤺", "🤾‍♂️", "🤾‍♀️", "🏌️‍♂️",
      "🏌️‍♀️", "🏇", "🧘‍♂️", "🧘‍♀️", "🏄‍♂️", "🏄‍♀️", "🏊‍♂️", "🏊‍♀️", "🤽‍♂️", "🤽‍♀️", "🚣‍♂️", "🚣‍♀️",
      "🧗‍♂️", "🧗‍♀️", "🚵‍♂️", "🚵‍♀️", "🚴‍♂️", "🚴‍♀️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️",
      "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧",
      "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🎲", "♟️",
      "🎯", "🎳", "🎮", "🎰", "🧩"
    ],
  },
  {
    id: "travel",
    name: "Travel & Places",
    iconType: "mci" as const,
    iconName: "car",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚",
      "🚛", "🚜", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚨", "🚔", "🚘", "🚖", "🚡",
      "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇",
      "✈️", "🛫", "🛬", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵️", "🚤", "🛥️",
      "🛳️", "⛴️", "🚢", "⚓️", "🛟", "⛽️", "🚧", "🚦", "🚥", "🗺️", "🗿", "🗽",
      "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲️", "⛱️", "🏖️", "🏝️", "🏜️",
      "🌋", "⛰️", "🏔️", "🏕️", "⛺️", "🏠", "🏡", "🏘️", "🏗️", "🏢", "🏬", "🏣",
      "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪️", "🕌", "⛩️"
    ],
  },
  {
    id: "objects",
    name: "Objects",
    iconType: "mci" as const,
    iconName: "lightbulb-outline",
    emojis: [
      "⌚️", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🕹️", "💽", "💾", "💿",
      "📀", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺",
      "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛️", "⏳", "📡",
      "🔋", "🪫", "🔌", "💡", "🔦", "🕯️", "🧯", "💸", "💵", "💴", "💶", "💷",
      "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️",
      "🔩", "⚙️", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️",
      "🛡️", "🚬", "⚰️", "🪦", "🏺", "🔮", "📿", "🧿", "💈", "💉", "🩸", "💊",
      "🩹", "🩺", "🚪", "🪞", "🪟", "🛏️", "🛋️", "🪑", "🚽", "🚿", "🛁", "🧴",
      "🧻", "🧼", "🪥", "🧽", "🛒", "📦", "🏷️", "📫", "📪", "📬", "📭", "📮",
      "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅",
      "🗑️", "📇", "🗃️", "🗳️", "🗄️", "📋", "📁", "📂", "🗂️", "🗞️", "📰", "📓",
      "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷", "🔗", "📎", "🖇️", "📐",
      "📏", "📌", "📍", "✂️", "🖊️", "🖋️", "✒️", "🖌️", "🖍️", "📝", "✏️", "🔍",
      "🔎", "🔏", "🔐", "🔒", "🔓"
    ],
  },
  {
    id: "symbols",
    name: "Symbols",
    iconType: "mci" as const,
    iconName: "music-note",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️",
      "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈️", "♉️", "♊️", "♋️", "♌️",
      "♍️", "♎️", "♏️", "♐️", "♑️", "♒️", "♓️", "🆔", "☢️", "☣️", "📴", "📳",
      "🈶", "🈚️", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴",
      "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕️", "🛑",
      "⛔️", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵",
      "🚭", "❗️", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "⚠️", "🚸", "🔱",
      "⚜️", "🔰", "♻️", "✅", "🈯️", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️",
      "🌀", "💤", "🏧", "🚾", "♿️", "🅿️", "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄",
      "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🆖", "🆗", "🆙",
      "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣",
      "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️",
      "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️",
      "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁",
      "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "🟰", "♾️", "💲",
      "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜",
      "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫️", "⚪️", "🟤",
      "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "▪️", "▫️", "◾️", "◽️", "◼️", "◻️",
      "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛️", "⬜️", "🟫", "🔈", "🔇", "🔉",
      "🔊", "🔔", "🔕", "📣", "📢", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️"
    ],
  },
  {
    id: "flags",
    name: "Flags",
    iconType: "feather" as const,
    iconName: "flag",
    emojis: [
      "🇳🇬", "🇺🇸", "🇬🇧", "🇨🇦", "🇩🇪", "🇫🇷", "🇯🇵", "🇨🇳", "🇮🇳", "🇧🇷", "🇦🇺", "🇿🇦",
      "🇬🇭", "🇰🇪", "🇪🇬", "🇦🇪", "🇸🇦", "🇪🇸", "🇮🇹", "🇳🇱", "🏁", "🚩", "🎌", "🏴",
      "🏳️", "🏳️‍🌈", "🏴‍☠️"
    ],
  },
];

interface WhatsAppEmojiPickerProps {
  visible: boolean;
  onSelectEmoji: (emoji: string) => void;
  onBackspace?: () => void;
  isDark?: boolean;
}

export function WhatsAppEmojiPicker({
  visible,
  onSelectEmoji,
  onBackspace,
  isDark = true,
}: WhatsAppEmojiPickerProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("recents");
  const [recents, setRecents] = useState<string[]>(DEFAULT_RECENTS);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Load saved recents on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENT_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRecents(parsed);
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      onSelectEmoji(emoji);

      // Prepend to recents & persist
      setRecents((prev) => {
        const filtered = prev.filter((e) => e !== emoji);
        const next = [emoji, ...filtered].slice(0, 40);
        AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [onSelectEmoji]
  );

  const handleBackspace = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (onBackspace) {
      onBackspace();
    }
  }, [onBackspace]);

  // Active Category Data
  const currentCategory = useMemo(() => {
    return EMOJI_CATEGORIES.find((c) => c.id === activeCategoryId) || EMOJI_CATEGORIES[0];
  }, [activeCategoryId]);

  // Filter emojis if user is searching
  const displayedEmojis = useMemo(() => {
    if (isSearching && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      // Gather all emojis and filter
      const all: string[] = [];
      EMOJI_CATEGORIES.forEach((cat) => {
        if (cat.id === "recents") return;
        cat.emojis.forEach((em) => {
          if (!all.includes(em)) all.push(em);
        });
      });
      return all.filter((e) => e.includes(q));
    }

    if (activeCategoryId === "recents") {
      return recents.length > 0 ? recents : DEFAULT_RECENTS;
    }
    return currentCategory.emojis;
  }, [activeCategoryId, currentCategory, isSearching, searchQuery, recents]);

  if (!visible) return null;

  // WhatsApp Color Palette
  const bg = isDark ? "#121b22" : "#ffffff";
  const headerBg = isDark ? "#121b22" : "#ffffff";
  const bottomBarBg = isDark ? "#1f2c34" : "#f0f2f5";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#e9edef" : "#111b21";
  const mutedText = isDark ? "#8696a0" : "#667781";
  const accentColor = "#00a884"; // Official WhatsApp Teal Accent
  const pillBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <View style={[styles.container, { backgroundColor: bg, borderTopColor: borderColor }]}>
      {/* ── Top Bar (Search, Tab Capsule, Backspace) ── */}
      <View style={[styles.topBar, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        {isSearching ? (
          <View style={[styles.searchRow, { backgroundColor: isDark ? "#1f2c34" : "#e9edef" }]}>
            <Feather name="search" size={16} color={mutedText} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search emoji"
              placeholderTextColor={mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <Pressable
              onPress={() => {
                setIsSearching(false);
                setSearchQuery("");
              }}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={mutedText} />
            </Pressable>
          </View>
        ) : (
          <>
            {/* Search Icon */}
            <Pressable
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => setIsSearching(true)}
              hitSlop={8}
            >
              <Feather name="search" size={20} color={mutedText} />
            </Pressable>

            {/* WhatsApp Capsule (Emoji / GIF / Sticker) */}
            <View style={[styles.tabCapsule, { backgroundColor: pillBg }]}>
              <View style={[styles.tabCapsuleItem, styles.tabCapsuleActive, { backgroundColor: isDark ? "#2a3942" : "#ffffff" }]}>
                <Feather name="smile" size={18} color={accentColor} />
              </View>
              <View style={styles.tabCapsuleItem}>
                <Text style={[styles.tabCapsuleText, { color: mutedText }]}>GIF</Text>
              </View>
              <View style={styles.tabCapsuleItem}>
                <MaterialCommunityIcons name="sticker-circle-outline" size={18} color={mutedText} />
              </View>
            </View>

            {/* Backspace Button */}
            <Pressable
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleBackspace}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="backspace-outline" size={22} color={mutedText} />
            </Pressable>
          </>
        )}
      </View>

      {/* ── Section Title ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: mutedText }]}>
          {isSearching ? `Search Results (${displayedEmojis.length})` : currentCategory.name}
        </Text>
      </View>

      {/* ── Emoji Grid ── */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {displayedEmojis.map((emoji, index) => (
          <Pressable
            key={`${emoji}-${index}`}
            onPress={() => handleSelectEmoji(emoji)}
            style={({ pressed }) => [
              styles.emojiCell,
              { opacity: pressed ? 0.5 : 1, transform: [{ scale: pressed ? 1.15 : 1 }] },
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
        {displayedEmojis.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: mutedText }]}>No emojis found</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Category Navigation Bar ── */}
      {!isSearching && (
        <View style={[styles.bottomBar, { backgroundColor: bottomBarBg, borderTopColor: borderColor }]}>
          {EMOJI_CATEGORIES.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.selectionAsync().catch(() => {});
                  }
                  setActiveCategoryId(cat.id);
                }}
                style={[styles.bottomTabItem, isActive && styles.bottomTabItemActive]}
              >
                {cat.iconType === "feather" ? (
                  <Feather
                    name={cat.iconName as any}
                    size={20}
                    color={isActive ? accentColor : mutedText}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={cat.iconName as any}
                    size={21}
                    color={isActive ? accentColor : mutedText}
                  />
                )}
                {isActive && <View style={[styles.activeUnderline, { backgroundColor: accentColor }]} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 310,
    width: "100%",
    borderTopWidth: 1,
  },
  topBar: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  tabCapsule: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 3,
    gap: 4,
  },
  tabCapsuleItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCapsuleActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  tabCapsuleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  emojiCell: {
    width: "12.5%", // 8 columns per row
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 27,
  },
  emptyContainer: {
    width: "100%",
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  bottomBar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  bottomTabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bottomTabItemActive: {},
  activeUnderline: {
    position: "absolute",
    bottom: 0,
    width: "60%",
    height: 3,
    borderRadius: 1.5,
  },
});
