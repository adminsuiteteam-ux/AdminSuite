import React, { useState } from "react";
import { Platform, Text, TextStyle, StyleProp } from "react-native";

interface ExpandableTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  textColor?: string;
  activeColor?: string;
}

export function ExpandableText({
  text,
  style,
  textColor,
  activeColor = "#3b82f6",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  // iOS threshold: ~450-500 chars or ~80-100 words. Let's use 480 chars or 90 words.
  // Android threshold: ~400-450 chars or ~65-85 words. Let's use 420 chars or 75 words.
  const charLimit = Platform.OS === "ios" ? 480 : 420;
  const wordLimit = Platform.OS === "ios" ? 90 : 75;

  const words = text.trim().split(/\s+/);
  const isLong = text.length > charLimit || words.length > wordLimit;

  if (!isLong || expanded) {
    return (
      <Text style={[style, textColor ? { color: textColor } : {}]}>
        {text}
      </Text>
    );
  }

  // Determine truncation point
  let truncatedText = text;

  if (text.length > charLimit) {
    truncatedText = text.slice(0, charLimit).trim();
  }

  if (words.length > wordLimit) {
    const truncatedWordsText = words.slice(0, wordLimit).join(" ");
    if (truncatedWordsText.length < truncatedText.length) {
      truncatedText = truncatedWordsText;
    }
  }

  // Clean up any trailing punctuation or spaces before appending ...
  truncatedText = truncatedText.replace(/[,.;:!\s]+$/, "");

  return (
    <Text style={[style, textColor ? { color: textColor } : {}]}>
      {truncatedText}...{" "}
      <Text
        style={{ color: activeColor, fontWeight: "bold" }}
        onPress={() => setExpanded(true)}
      >
        Read more
      </Text>
    </Text>
  );
}
