"use client";

import {
  BaseElementProps,
  MicrobitProps,
} from "@/circuit_canvas/types/circuit";
import { BaseElement } from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState, useRef } from "react";
import { Group, Image, Rect, Text, Circle } from "react-konva";

export default function Microbit({
  leds,
  onControllerInput,
  isSimulationOn,
  ...props
}: MicrobitProps & BaseElementProps) {
  const [imgMicrobit, setImgMicrobit] = useState<HTMLImageElement | null>(null);
  const [imgOnnState, setImgOnnState] = useState<HTMLImageElement | null>(null);
  const [imgOffState, setImgOffState] = useState<HTMLImageElement | null>(null);
  const [btnPressed, setBtnPressed] = useState<"A" | "B" | "AB" | null>(null);
  // Logo (touch sensor) interaction state
  const [logoState, setLogoState] = useState<"idle" | "hover" | "pressed">("idle");
  const isPressingRef = useRef(false);

  // Tunable constants for logo overlay alignment
  // Adjust LOGO_X / LOGO_Y to perfectly cover the SVG logo.
  const LOGO_X = 95.2;     // horizontal position
  const LOGO_Y = 91.2;     // vertical position (was 55; moved down to align)
  const LOGO_W = 29.2;
  const LOGO_H = 16.2;

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit.svg";
    image.onload = () => setImgMicrobit(image);
    image.alt = "Microbit";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_onn.svg";
    image.onload = () => setImgOnnState(image);
    image.alt = "Microbit";
  }, []);

  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/microbit_usb_off.svg";
    image.onload = () => setImgOffState(image);
    image.alt = "Microbit";
  }, []);

  // Button press/release handlers for hold logic
  const handleButtonDown = (btn: "A" | "B" | "AB") => {
    setBtnPressed(btn);
    onControllerInput?.({ type: "button", button: btn, state: "pressed" });
  };
  const handleButtonUp = (btn: "A" | "B" | "AB") => {
    setBtnPressed(null);
    onControllerInput?.({ type: "button", button: btn, state: "released" });
  };

  // Logo stroke color logic
  const logoStroke =
    !isSimulationOn
      ? "rgb(200,36,52)"
      : logoState === "pressed"
        ? "green"
        : logoState === "hover"
          ? "yellow"
          : "rgb(200,36,52)";

  const enableLogoInteraction = isSimulationOn;

  const setCursor = (cursor: string, e: any) => {
    const stage = e?.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  };

  const onLogoEnter = (e: any) => {
    if (!enableLogoInteraction) return;
    if (!isPressingRef.current) setLogoState("hover");
    setCursor("pointer", e);
  };

  const onLogoLeave = (e: any) => {
    if (!enableLogoInteraction) return;
    if (isPressingRef.current) {
      // user dragged outside while pressing
      setLogoState("pressed");
    } else {
      setLogoState("idle");
      setCursor("default", e);
    }
  };

  const onLogoDown = (e: any) => {
    if (!enableLogoInteraction) return;
    isPressingRef.current = true;
    setLogoState("pressed");
    setCursor("pointer", e);

    // --- NEW: notify controller (pressed)
    onControllerInput?.({ type: "logo", state: "pressed" });
  };

  const endPress = (inside: boolean) => {
    isPressingRef.current = false;
    setLogoState(inside ? "hover" : "idle");
  };

  const onLogoUp = () => {
    if (!enableLogoInteraction) return;
    endPress(true);

    // --- NEW: notify controller (released)
    onControllerInput?.({ type: "logo", state: "released" });
  };

  // Global mouseup to handle release outside
  useEffect(() => {
    const handleWindowUp = () => {
      if (isPressingRef.current) {
        endPress(false);

        // --- NEW: ensure release is sent even if pointer leaves hit area
        if (enableLogoInteraction) {
          onControllerInput?.({ type: "logo", state: "released" });
        }
      }
    };
    window.addEventListener("mouseup", handleWindowUp);
    window.addEventListener("touchend", handleWindowUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchend", handleWindowUp);
    };
  }, [enableLogoInteraction, onControllerInput]);

  // Global mouseup to handle releasing a button if pointer leaves the hit area
  useEffect(() => {
    const handleGlobalUp = () => {
      if (btnPressed) {
        // send a release for whichever button was pressed
        handleButtonUp(btnPressed);
      }
    };
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchend", handleGlobalUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [btnPressed]);

  const onLogoClick = () => {
    // Hook for future logo touch event dispatch if needed
  };
  return (
    <BaseElement {...props}>
      <Group>
        {imgOffState && !isSimulationOn && (
          <Image
            image={imgOffState}
            width={220}
            height={220}
            x={0}
            y={-25}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 6 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgOnnState && isSimulationOn && (
          <Image
            image={imgOnnState}
            width={220}
            height={220}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}
        {imgMicrobit && (
          <Image
            image={imgMicrobit}
            width={220}
            height={220}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 10 : 0}
            shadowOffset={{ x: 15, y: -15 }}
            shadowOpacity={0}
          />
        )}

        {/* 5x5 LED Grid (matrix is rows-first: leds[y][x]) */}
        {leds.map((row, y) =>
          row.map((_, x) => {
            const b = Math.max(0, Math.min(255, Number(leds[y][x] || 0)));
            const on = b > 0;
            const brightness = on ? b / 255 : 0;
            
            const centerX = 84 + x * 12.4;
            const centerY = 114 + y * 12.4;
            
            return (
              <Group key={`${x}-${y}`}>
                {/* Outermost extra wide glow - most transparent */}
                {on && (
                  <Rect
                    x={centerX - 8}
                    y={centerY - 8}
                    width={16}
                    height={16}
                    fill="#8B0000"
                    opacity={0.08 * brightness}
                    cornerRadius={8}
                    blur={10}
                  />
                )}
                {/* Outermost soft glow - centered */}
                {on && (
                  <Rect
                    x={centerX - 6}
                    y={centerY - 6}
                    width={12}
                    height={12}
                    fill="#8B0000"
                    opacity={0.15 * brightness}
                    cornerRadius={6}
                    blur={8}
                  />
                )}
                {/* Middle glow ring - centered */}
                {on && (
                  <Rect
                    x={centerX - 4.5}
                    y={centerY - 4.5}
                    width={9}
                    height={9}
                    fill="#CC0000"
                    opacity={0.25 * brightness}
                    cornerRadius={4}
                    blur={5}
                  />
                )}
                {/* Inner bright glow - centered */}
                {on && (
                  <Rect
                    x={centerX - 3}
                    y={centerY - 3}
                    width={6}
                    height={6}
                    fill="#FF4444"
                    opacity={0.35 * brightness}
                    cornerRadius={2}
                    blur={3}
                  />
                )}
                {/* Main LED body - square shape */}
                <Rect
                  x={centerX - 2.5}
                  y={centerY - 2.5}
                  width={5}
                  height={5}
                  fill={on ? "#FF3333" : "#545050ff"}
                  opacity={on ? 0.9 : 0.5}
                  cornerRadius={1.5}
                  shadowColor={on ? "#FF6666" : "#000000"}
                  shadowBlur={on ? 2 : 1}
                  shadowOpacity={on ? 0.4 : 0.2}
                  shadowOffset={{ x: 0, y: 0 }}
                />
                {/* Bright center highlight - small square */}
                {on && (
                  <Rect
                    x={centerX - 1}
                    y={centerY - 1}
                    width={2}
                    height={2}
                    fill="#FFFFFF"
                    opacity={0.8 * brightness}
                    cornerRadius={0.5}
                  />
                )}
              </Group>
            );
          })
        )}

        {/* Touch (Logo) Sensor Overlay */}
        <Group
          x={LOGO_X}
          y={LOGO_Y}
          listening={true}
          onMouseEnter={onLogoEnter}
          onMouseLeave={onLogoLeave}
          onMouseDown={onLogoDown}
          onMouseUp={onLogoUp}
          onClick={onLogoClick}
          onTouchStart={onLogoDown}
          onTouchEnd={onLogoUp}
        >
          {/* Outer oval */}
          <Rect
            width={LOGO_W}
            height={LOGO_H}
            cornerRadius={20}
            stroke={logoStroke}
            strokeWidth={3}
            fill="rgba(0,0,0,0.55)"
            opacity={10}
          />
          {/* Inner pads */}
          <Circle x={LOGO_W * 0.30} y={LOGO_H / 2} radius={2.5} fill={logoStroke} />
          <Circle x={LOGO_W * 0.70} y={LOGO_H / 2} radius={2.5} fill={logoStroke} />
          {/* Invisible enlarged hit area */}
          <Rect
            width={LOGO_W + 6}
            height={LOGO_H + 6}
            x={-3}
            y={-3}
            cornerRadius={24}
            fill="transparent"
          />
        </Group>

        {/* Button AB */}
        <Group
          x={164}
          y={96}
          onMouseDown={() => handleButtonDown("AB")}
          onMouseUp={() => handleButtonUp("AB")}
          onTouchStart={() => handleButtonDown("AB")}
          onTouchEnd={() => handleButtonUp("AB")}
        >
          {btnPressed === "AB" && (
            <Rect
              width={12}
              height={12}
              fill=""
              stroke="red"
              strokeWidth={1.5}
              cornerRadius={12}
              x={2.8}
              y={0.6}
            />
          )}
          <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button A */}
        <Group
          x={35}
          y={130}
          onMouseDown={() => handleButtonDown("A")}
          onMouseUp={() => handleButtonUp("A")}
          onTouchStart={() => handleButtonDown("A")}
          onTouchEnd={() => handleButtonUp("A")}
        >
          {btnPressed === "A" && (
            <Rect
              width={16}
              height={16}
              fill=""
              stroke="#1B5FC5"
              strokeWidth={1.2}
              cornerRadius={12}
              x={2.8}
              y={0.6}
            />
          )}
          <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>

        {/* Button B */}
        <Group
          x={165}
          y={130}
          onMouseDown={() => handleButtonDown("B")}
          onMouseUp={() => handleButtonUp("B")}
          onTouchStart={() => handleButtonDown("B")}
          onTouchEnd={() => handleButtonUp("B")}
        >
          {btnPressed === "B" && (
            <Rect
              width={16}
              height={16}
              fill=""
              stroke="#1B5FC5"
              strokeWidth={1.2}
              cornerRadius={12}
              x={1.6}
              y={0.6}
            />
          )}
          <Rect width={20} height={20} fill="" cornerRadius={10} shadowBlur={3} />
          <Text text="" fill="white" x={6} y={3} fontSize={12} fontStyle="bold" />
        </Group>
      </Group>
    </BaseElement>
  );
}