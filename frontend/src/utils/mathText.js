const normalizeBaseText = (value) =>
  String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/[−–—]/g, "-")
    .trim();

const isMathLikeLine = (value) =>
  /[=+\-*/^_()[\]{}<>]|\\|√|π|∞|≤|≥|≠|≈|∑|∫|Δ|\d\s*[a-zA-Z]|[a-zA-Z]\s*\d/.test(value);

const shouldAttachAsExponent = (previousLine, currentLine) => {
  if (!previousLine || !currentLine) {
    return false;
  }

  if (currentLine.includes(" ")) {
    return false;
  }

  if (/^[+\-]/.test(currentLine)) {
    return false;
  }

  if (!/^[a-zA-Z0-9()+-]{1,3}$/.test(currentLine)) {
    return false;
  }

  if (/[=,:;.!?]$/.test(previousLine)) {
    return false;
  }

  return /[a-zA-Z0-9)\]}]$/.test(previousLine);
};

const shouldJoinMathLine = (previousLine, currentLine) => {
  if (!previousLine || !currentLine) {
    return false;
  }

  if (/^[=+\-*/,:;)]/.test(currentLine)) {
    return true;
  }

  return isMathLikeLine(previousLine) && isMathLikeLine(currentLine) && currentLine.length <= 40;
};

const mergeMathLines = (lines) => {
  const mergedLines = [];

  lines.forEach((line) => {
    if (mergedLines.length === 0) {
      mergedLines.push(line);
      return;
    }

    const previousLine = mergedLines[mergedLines.length - 1];

    if (shouldAttachAsExponent(previousLine, line)) {
      mergedLines[mergedLines.length - 1] = `${previousLine}^${line}`;
      return;
    }

    if (shouldJoinMathLine(previousLine, line)) {
      mergedLines[mergedLines.length - 1] = `${previousLine} ${line}`;
      return;
    }

    mergedLines.push(line);
  });

  return mergedLines;
};

export const normalizeMathText = (value, { inline = false } = {}) => {
  const text = normalizeBaseText(value);

  if (!text) {
    return "";
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    return "";
  }

  const mergedLines = mergeMathLines(lines);
  const output = inline ? mergedLines.join(" ") : mergedLines.join("\n");

  return output
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .trim();
};

export const normalizeInlineMathText = (value) => normalizeMathText(value, { inline: true });

const readMathToken = (text, startIndex) => {
  if (text[startIndex] === "{") {
    let depth = 1;
    let index = startIndex + 1;
    let value = "";

    while (index < text.length) {
      const character = text[index];

      if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          return {
            value,
            nextIndex: index + 1,
          };
        }
      }

      if (depth > 0) {
        value += character;
      }

      index += 1;
    }
  }

  let index = startIndex;
  let value = "";

  while (index < text.length && /[a-zA-Z0-9()+\-]/.test(text[index])) {
    value += text[index];
    index += 1;
  }

  if (!value) {
    return null;
  }

  return {
    value,
    nextIndex: index,
  };
};

export const splitMathSegments = (value) => {
  const text = normalizeMathText(value);
  const segments = [];
  let buffer = "";
  let index = 0;

  const pushBuffer = () => {
    if (!buffer) {
      return;
    }
    segments.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (index < text.length) {
    const character = text[index];

    // newline
    if (character === "\n") {
      pushBuffer();
      segments.push({ type: "newline" });
      index += 1;
      continue;
    }

    // \frac{numerator}{denominator}
    if (character === "\\" && text.slice(index, index + 5) === "\\frac") {
      const afterFrac = index + 5;
      const numToken = readMathToken(text, afterFrac);
      if (numToken) {
        const denToken = readMathToken(text, numToken.nextIndex);
        if (denToken) {
          pushBuffer();
          segments.push({
            type: "frac",
            numerator: numToken.value,
            denominator: denToken.value,
          });
          index = denToken.nextIndex;
          continue;
        }
      }
    }

    // simple fraction: digits/digits or letter/digits or digits/letter e.g. 1/2, x/3, 3/x
    // only when surrounded by non-word chars (or start/end) to avoid splitting URLs or words
    if (character === "/" && index > 0 && index + 1 < text.length) {
      const before = buffer.match(/([a-zA-Z0-9]+)$/);
      const afterChar = text[index + 1];
      if (before && /[a-zA-Z0-9]/.test(afterChar)) {
        const numStr = before[1];
        // read denominator token starting at index+1
        let denEnd = index + 1;
        let denStr = "";
        while (denEnd < text.length && /[a-zA-Z0-9]/.test(text[denEnd])) {
          denStr += text[denEnd];
          denEnd += 1;
        }
        if (denStr) {
          // remove the matched numerator from buffer
          buffer = buffer.slice(0, buffer.length - numStr.length);
          pushBuffer();
          segments.push({
            type: "frac",
            numerator: numStr,
            denominator: denStr,
          });
          index = denEnd;
          continue;
        }
      }
    }

    // sup / sub
    if ((character === "^" || character === "_") && index + 1 < text.length) {
      const token = readMathToken(text, index + 1);
      if (token) {
        pushBuffer();
        segments.push({
          type: character === "^" ? "sup" : "sub",
          value: token.value,
        });
        index = token.nextIndex;
        continue;
      }
    }

    buffer += character;
    index += 1;
  }

  pushBuffer();
  return segments;
};
