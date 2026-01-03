"use client";
import React from "react";

// Inline CSS as a string
const styles = `
.chronicleButton {
  --chronicle-button-default-hover-color: var(--theme-color);
  --chronicle-button-border-radius: var(--general-rounding, 8px);
  border-radius: var(--chronicle-button-border-radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  line-height: 1;
  padding: 1.5rem 2.5rem;
  cursor: pointer;
  border: none;
  font-weight: 700;
  font-size: 1.25rem;
  background: var(--chronicle-button-background);
  color: var(--chronicle-button-foreground);
  transition: background 0.4s linear, color 0.4s linear, transform 0.25s ease, box-shadow 0.25s ease;
  will-change: background, color;
  position: relative;
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  backdrop-filter: saturate(120%) blur(2px);
  white-space: nowrap;
}

.chronicleButton:hover {
  background: var(--chronicle-button-hover-background);
  color: var(--chronicle-button-hover-foreground);
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 10px 24px rgba(0,0,0,0.16);
}

.chronicleButton span {
  position: relative;
  display: block;
  perspective: 108px;
}

.chronicleButton span:nth-of-type(2) {
  position: absolute;
}

.chronicleButton em {
  font-style: normal;
  display: inline-block;
  font-size: 1.25rem;
  color: inherit;
  will-change: transform, opacity, color, transition;
  transition: transform 0.55s cubic-bezier(.645,.045,.355,1), opacity 0.35s linear 0.2s, color 0.4s linear;
  white-space: nowrap;
}

.chronicleButton span:nth-of-type(1) em {
  transform-origin: top;
}
.chronicleButton span:nth-of-type(2) em {
  opacity: 0;
  transform: rotateX(-90deg) scaleX(.9) translate3d(0,10px,0);
  transform-origin: bottom;
}
.chronicleButton:hover span:nth-of-type(1) em {
  opacity: 0;
  transform: rotateX(90deg) scaleX(.9) translate3d(0,-10px,0);
}
.chronicleButton:hover span:nth-of-type(2) em {
  opacity: 1;
  transform: rotateX(0deg) scaleX(1) translateZ(0);
  transition: transform 0.75s cubic-bezier(.645,.045,.355,1), opacity 0.35s linear 0.3s, color 0.4s linear;
}

.chronicleButton.outlined {
  background: transparent;
  border: 2px solid var(--chronicle-button-background);
  padding: calc(1rem - var(--outline-padding-adjustment)) 0;
  color: var(--chronicle-button-background);
  transition: border 0.4s linear, color 0.4s linear, background-color 0.4s linear;
  will-change: border, color;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.chronicleButton.outlined:hover {
  background: var(--outlined-button-background-on-hover, transparent);
  border-color: var(--chronicle-button-hover-background);
  color: var(--chronicle-button-hover-background);
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
}

.chronicleButton.outlined span:nth-of-type(1) em,
.chronicleButton.outlined span:nth-of-type(2) em {
  transition: color 0.4s linear;
}

.chronicleButton.outlined:hover span:nth-of-type(1) em,
.chronicleButton.outlined:hover span:nth-of-type(2) em {
  color: var(--chronicle-button-hover-background);
}
`;

interface ChronicleButtonProps {
  text: string;
  onClick?: () => void;
  hoverColor?: string;
  width?: string;
  outlined?: boolean;
  outlinePaddingAdjustment?: string;
  borderRadius?: string;
  outlinedButtonBackgroundOnHover?: string;
  customBackground?: string;
  customForeground?: string;
  hoverForeground?: string;
  fontFamily?: string;
}

export const ChronicleButton: React.FC<ChronicleButtonProps> = ({
  text,
  onClick,
  hoverColor = "#a594fd",
  width = "auto",
  outlined = false,
  outlinePaddingAdjustment = "2px",
  borderRadius = "2rem",
  outlinedButtonBackgroundOnHover = "transparent",
  customBackground = "#fff",
  customForeground = "#111014",
  hoverForeground = "#111014",
  fontFamily,
}) => {
  // Inject styles once
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.getElementById("chronicle-button-style")) {
      const style = document.createElement("style");
      style.id = "chronicle-button-style";
      style.innerHTML = styles;
      document.head.appendChild(style);
    }
  }, []);

  const buttonStyle = {
    "--chronicle-button-background": customBackground,
    "--chronicle-button-foreground": customForeground,
    "--chronicle-button-hover-background": hoverColor,
    "--chronicle-button-hover-foreground": hoverForeground,
    "--outline-padding-adjustment": outlinePaddingAdjustment,
    "--chronicle-button-border-radius": borderRadius,
    "--outlined-button-background-on-hover": outlinedButtonBackgroundOnHover,
    width: width,
    borderRadius: borderRadius,
    fontFamily: fontFamily,
  } as React.CSSProperties;

  return (
    <button
      className={`chronicleButton${outlined ? " outlined" : ""}`}
      onClick={onClick}
      style={buttonStyle}
      type="button"
    >
      <span>
        <em>{text}</em>
      </span>
      <span>
        <em>{text}</em>
      </span>
    </button>
  );
};
