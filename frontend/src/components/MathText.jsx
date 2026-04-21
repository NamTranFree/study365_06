import { splitMathSegments } from "../utils/mathText";

function FracSegment({ numerator, denominator }) {
  return (
    <span className="math-frac" aria-label={`${numerator} phần ${denominator}`}>
      <span className="math-frac-num">{numerator}</span>
      <span className="math-frac-den">{denominator}</span>
    </span>
  );
}

function MathText({ text, as: Tag = "span", className = "" }) {
  const segments = splitMathSegments(text);

  return (
    <Tag className={["math-text", className].filter(Boolean).join(" ")}>
      {segments.map((segment, index) => {
        if (segment.type === "newline") {
          return <br key={`newline-${index}`} />;
        }

        if (segment.type === "sup") {
          return <sup key={`sup-${index}`}>{segment.value}</sup>;
        }

        if (segment.type === "sub") {
          return <sub key={`sub-${index}`}>{segment.value}</sub>;
        }

        if (segment.type === "frac") {
          return (
            <FracSegment
              key={`frac-${index}`}
              numerator={segment.numerator}
              denominator={segment.denominator}
            />
          );
        }

        return <span key={`text-${index}`}>{segment.value}</span>;
      })}
    </Tag>
  );
}

export default MathText;
