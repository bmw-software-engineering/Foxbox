/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
/* eslint-disable @typescript-eslint/unbound-method */

import { renderHook, act } from "@testing-library/react";
import { MutableRefObject } from "react";

import { debouncePromise } from "@lichtblick/den/async";
import { Time, toSec } from "@lichtblick/rostime";
import {
  useSetHoverValue,
  useClearHoverValue,
} from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { OffscreenCanvasRenderer } from "@lichtblick/suite-base/panels/Plot/OffscreenCanvasRenderer";
import { PlotCoordinator } from "@lichtblick/suite-base/panels/Plot/PlotCoordinator";
import { PlotConfig } from "@lichtblick/suite-base/panels/Plot/config";
import { HoverElement } from "@lichtblick/suite-base/panels/Plot/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";

import usePlotInteractionHandlers from "./usePlotInteractionHandlers";

jest.mock("@lichtblick/den/async", () => ({
  debouncePromise: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/context/TimelineInteractionStateContext", () => ({
  useSetHoverValue: jest.fn(),
  useClearHoverValue: jest.fn(),
  useTimelineInteractionState: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/components/MessagePipeline", () => ({
  useMessagePipelineGetter: jest.fn(),
}));

describe("usePlotInteractionHandlers", () => {
  const mockCoordinator = {
    getXValueAtPixel: jest.fn(() => BasicBuilder.number()),
    resetBounds: jest.fn(),
    setZoomMode: jest.fn(),
    getCsvData: jest.fn(),
    addInteractionEvent: jest.fn(),
  } as unknown as PlotCoordinator;
  const mockRenderer = {
    getElementsAtPixel: jest.fn(),
  } as unknown as OffscreenCanvasRenderer;
  const mockSubscriberId = BasicBuilder.string();
  const mockCustomTitle = BasicBuilder.string();
  const mockConfig = {
    xAxisVal: "timestamp",
    PANEL_TITLE_CONFIG_KEY: mockCustomTitle,
  } as unknown as PlotConfig;
  const mockSetActiveTooltip = jest.fn();
  const mockDraggingRef = { current: false } as MutableRefObject<boolean>;
  const mockSetHoverValue = jest.fn();
  const mockClearHoverValue = jest.fn();

  const setup = () => {
    jest.clearAllMocks();
    (useSetHoverValue as jest.Mock).mockReturnValue(mockSetHoverValue);
    (useClearHoverValue as jest.Mock).mockReturnValue(mockClearHoverValue);

    return renderHook(() =>
      usePlotInteractionHandlers(
        mockCoordinator,
        mockRenderer,
        mockSubscriberId,
        mockConfig,
        mockSetActiveTooltip,
        { shouldSync: false },
        mockDraggingRef,
      ),
    );
  };

  const setupWithoutCoordinator = () => {
    jest.clearAllMocks();
    (useSetHoverValue as jest.Mock).mockReturnValue(mockSetHoverValue);
    (useClearHoverValue as jest.Mock).mockReturnValue(mockClearHoverValue);

    return renderHook(() =>
      usePlotInteractionHandlers(
        undefined,
        mockRenderer,
        mockSubscriberId,
        mockConfig,
        mockSetActiveTooltip,
        { shouldSync: false },
        mockDraggingRef,
      ),
    );
  };

  const mockBuildTooltip = jest.fn();
  const mockClientX = BasicBuilder.number();
  const mockClientY = BasicBuilder.number();
  const mockLeft = BasicBuilder.number();
  const mockTop = BasicBuilder.number();
  const expectedCanvasX = mockClientX - mockLeft;
  const expectedCanvasY = mockClientY - mockTop;

  const triggerMouseMove = async (result: any) => {
    await act(async () => {
      result.current.onMouseMove({
        clientX: mockClientX,
        clientY: mockClientY,
        currentTarget: {
          getBoundingClientRect: jest.fn(() => ({
            left: mockLeft,
            top: mockTop,
          })),
        },
      } as unknown as React.MouseEvent<HTMLElement>);
    });
  };

  beforeEach(() => {
    (debouncePromise as jest.Mock).mockReturnValue(mockBuildTooltip);
  });

  describe("onMouseMove", () => {
    describe("when xAxisMode is timestamp", () => {
      it("sets hover value correctly", async () => {
        const { result } = setup();
        await triggerMouseMove(result);

        expect(result.current.onMouseMove).toBeDefined();
        expect(mockCoordinator.getXValueAtPixel).toHaveBeenCalledWith(expectedCanvasX);
        expect(mockBuildTooltip).toHaveBeenCalledWith({
          clientX: mockClientX,
          clientY: mockClientY,
          canvasX: expectedCanvasX,
          canvasY: expectedCanvasY,
        });
        expect(mockSetHoverValue).toHaveBeenCalledWith({
          componentId: mockSubscriberId,
          value: expect.any(Number),
          type: "PLAYBACK_SECONDS",
        });
      });
    });

    describe("when xAxisMode is not timestamp", () => {
      it("sets hover value with type OTHER", async () => {
        const mockConfigWithOtherXAxisMode = {
          ...mockConfig,
          xAxisVal: "other",
        } as unknown as PlotConfig;
        const { result } = renderHook(() =>
          usePlotInteractionHandlers(
            mockCoordinator,
            mockRenderer,
            mockSubscriberId,
            mockConfigWithOtherXAxisMode,
            mockSetActiveTooltip,
            { shouldSync: false },
            mockDraggingRef,
          ),
        );
        await triggerMouseMove(result);

        expect(result.current.onMouseMove).toBeDefined();
        expect(mockCoordinator.getXValueAtPixel).toHaveBeenCalledWith(expectedCanvasX);
        expect(mockBuildTooltip).toHaveBeenCalledWith({
          clientX: mockClientX,
          clientY: mockClientY,
          canvasX: expectedCanvasX,
          canvasY: expectedCanvasY,
        });
        expect(mockSetHoverValue).toHaveBeenCalledWith({
          componentId: mockSubscriberId,
          value: expect.any(Number),
          type: "OTHER",
        });
      });
    });

    describe("when coordinator is not provided", () => {
      it("should return early", async () => {
        const { result } = setupWithoutCoordinator();
        await triggerMouseMove(result);

        expect(mockCoordinator.getXValueAtPixel).not.toHaveBeenCalled();
        expect(mockSetHoverValue).not.toHaveBeenCalled();
      });
    });

    it("clears active tooltip if no tooltip items are found", async () => {
      (debouncePromise as jest.Mock).mockImplementationOnce((fn) => fn);
      (mockRenderer.getElementsAtPixel as jest.Mock).mockReturnValueOnce([]);

      const { result } = setup();
      await triggerMouseMove(result);

      expect(mockSetActiveTooltip).toHaveBeenCalledWith(undefined);
      expect(mockSetActiveTooltip).toHaveBeenCalledTimes(1);
    });

    it("set active tooltip if tooltip items are found with correct data", async () => {
      const elements: HoverElement[] = [
        {
          configIndex: BasicBuilder.number(),
          data: {
            x: BasicBuilder.number(),
            y: BasicBuilder.number(),
            value: BasicBuilder.number(),
          },
        },
      ];
      (debouncePromise as jest.Mock).mockImplementationOnce((fn) => fn);
      (mockRenderer.getElementsAtPixel as jest.Mock).mockReturnValueOnce(elements);
      const expectedResult: any = {
        x: mockClientX,
        y: mockClientY,
        data: [{ configIndex: elements[0]!.configIndex, value: elements[0]!.data.value }],
      };

      const { result } = setup();
      await triggerMouseMove(result);

      expect(mockSetActiveTooltip).toHaveBeenCalledWith(expectedResult);
      expect(mockSetActiveTooltip).toHaveBeenCalledTimes(1);
    });

    it("set active tooltip if tooltip items are found when value is a time object", async () => {
      const elements: HoverElement[] = [
        {
          configIndex: BasicBuilder.number(),
          data: {
            x: BasicBuilder.number(),
            y: BasicBuilder.number(),
            value: RosTimeBuilder.time(),
          },
        },
      ];
      (debouncePromise as jest.Mock).mockImplementationOnce((fn) => fn);
      (mockRenderer.getElementsAtPixel as jest.Mock).mockReturnValueOnce(elements);
      const expectedResult: any = {
        x: mockClientX,
        y: mockClientY,
        data: [
          { configIndex: elements[0]!.configIndex, value: toSec(elements[0]!.data.value as Time) },
        ],
      };

      const { result } = setup();
      await triggerMouseMove(result);

      expect(mockSetActiveTooltip).toHaveBeenCalledWith(expectedResult);
      expect(mockSetActiveTooltip).toHaveBeenCalledTimes(1);
    });

    it("set active tooltip if tooltip items are found when value is undefined", async () => {
      const elements: HoverElement[] = [
        {
          configIndex: BasicBuilder.number(),
          data: {
            x: BasicBuilder.number(),
            y: BasicBuilder.number(),
            value: undefined,
          },
        },
      ];
      (debouncePromise as jest.Mock).mockImplementationOnce((fn) => fn);
      (mockRenderer.getElementsAtPixel as jest.Mock).mockReturnValueOnce(elements);
      const expectedResult: any = {
        x: mockClientX,
        y: mockClientY,
        data: [{ configIndex: elements[0]!.configIndex, value: elements[0]!.data.y }],
      };

      const { result } = setup();
      await triggerMouseMove(result);

      expect(mockSetActiveTooltip).toHaveBeenCalledWith(expectedResult);
      expect(mockSetActiveTooltip).toHaveBeenCalledTimes(1);
    });

    it("set active tooltip if tooltip items are found when having multiple hover elements", async () => {
      const elements = BasicBuilder.multiple<HoverElement>(() => ({
        configIndex: BasicBuilder.number(),
        data: { x: BasicBuilder.number(), y: BasicBuilder.number(), value: BasicBuilder.number() },
      }));
      const expectedResult: any = {
        x: mockClientX,
        y: mockClientY,
        data: elements.map((element) => ({
          configIndex: element.configIndex,
          value: element.data.value,
        })),
      };
      (debouncePromise as jest.Mock).mockImplementationOnce((fn) => fn);
      (mockRenderer.getElementsAtPixel as jest.Mock).mockReturnValueOnce(elements);

      const { result } = setup();
      await triggerMouseMove(result);

      expect(mockSetActiveTooltip).toHaveBeenCalledWith(expectedResult);
      expect(mockSetActiveTooltip).toHaveBeenCalledTimes(1);
    });

    describe("when using actual debouncePromise", () => {
      it("calls debouncePromise with correct arguments", async () => {
        const { result } = setup();
        await triggerMouseMove(result);

        expect(mockCoordinator.getXValueAtPixel).toHaveBeenCalledWith(expectedCanvasX);
        expect(mockSetHoverValue).toHaveBeenCalledWith({
          componentId: mockSubscriberId,
          value: expect.any(Number),
          type: "PLAYBACK_SECONDS",
        });
      });

      it("clears active tooltip if no tooltip items are found", async () => {
        (mockRenderer.getElementsAtPixel as jest.Mock).mockReturnValueOnce([]);
        (debouncePromise as jest.Mock).mockImplementationOnce((fn) => fn);

        const { result } = setup();
        await triggerMouseMove(result);

        expect(mockSetActiveTooltip).toHaveBeenCalledWith(undefined);
        expect(mockSetHoverValue).toHaveBeenCalled();
      });

      it("does not clear active tooltip if tooltip items are found", async () => {
        (mockRenderer.getElementsAtPixel as jest.Mock).mockReturnValueOnce([]);

        const { result } = setup();
        await triggerMouseMove(result);

        expect(mockSetActiveTooltip).not.toHaveBeenCalledWith(undefined);
        expect(mockSetHoverValue).toHaveBeenCalled();
      });
    });

    it("does not set active tooltip if isMounted is false", async () => {
      (debouncePromise as jest.Mock).mockImplementationOnce((fn) => fn);
      const { result, unmount } = setup();

      unmount();
      await triggerMouseMove(result);

      expect(mockSetActiveTooltip).not.toHaveBeenCalled();
    });
  });

  describe("onMouseOut", () => {
    it("clears hover value", () => {
      const { result } = setup();

      act(() => {
        result.current.onMouseOut();
      });

      expect(mockSetActiveTooltip).toHaveBeenCalledWith(undefined);
      expect(mockClearHoverValue).toHaveBeenCalledWith(mockSubscriberId);
    });

    it("sets mousePresentRef to false", () => {
      const { result } = setup();

      act(() => {
        result.current.onMouseOut();
      });

      expect(mockDraggingRef.current).toBe(false);
    });
  });

  describe("onWheel", () => {
    const triggerWheel = (result: any, boundingRect: any) => {
      const deltaX = BasicBuilder.number();
      const deltaY = BasicBuilder.number();
      const clientX = BasicBuilder.number();
      const clientY = BasicBuilder.number();

      act(() => {
        result.current.onWheel({
          deltaX,
          deltaY,
          clientX,
          clientY,
          currentTarget: {
            getBoundingClientRect: jest.fn(() => boundingRect),
          },
        } as unknown as React.WheelEvent<HTMLElement>);
      });

      return { deltaX, deltaY, clientX, clientY };
    };

    it("handles wheel event correctly", () => {
      const { result } = setup();
      const boundingRectLeft = BasicBuilder.number();
      const boundingRectTop = BasicBuilder.number();

      const boundingRect = {
        left: boundingRectLeft,
        top: boundingRectTop,
        toJSON: jest.fn().mockReturnValue({
          left: boundingRectLeft,
          top: boundingRectTop,
        }),
      };

      const { deltaX, deltaY, clientX, clientY } = triggerWheel(result, boundingRect);

      expect(mockCoordinator.addInteractionEvent).toHaveBeenCalledWith({
        type: "wheel",
        cancelable: false,
        deltaX,
        deltaY,
        clientX,
        clientY,
        boundingClientRect: boundingRect.toJSON(),
      });
    });

    describe("when coordinator is not provided", () => {
      it("should return early", () => {
        const { result } = setupWithoutCoordinator();
        const boundingRect = {
          left: BasicBuilder.number(),
          top: BasicBuilder.number(),
        };

        triggerWheel(result, boundingRect);

        expect(mockCoordinator.addInteractionEvent).not.toHaveBeenCalled();
      });
    });
  });

  describe("onResetView", () => {
    it("resets coordinator bounds", () => {
      const { result } = setup();
      act(() => {
        result.current.onResetView();
      });

      expect(mockCoordinator.resetBounds).toHaveBeenCalled();
    });

    describe("when coordinator is not provided", () => {
      it("should return early", () => {
        const { result } = setupWithoutCoordinator();

        act(() => {
          result.current.onResetView();
        });

        expect(mockCoordinator.resetBounds).not.toHaveBeenCalled();
      });
    });
  });

  describe("key handlers", () => {
    it("sets zoom mode to 'y' on key down 'v'", () => {
      const { result } = setup();

      act(() => {
        result.current.keyDownHandlers.v();
      });

      expect(mockCoordinator.setZoomMode).toHaveBeenCalledWith("y");
    });

    it("sets zoom mode to 'xy' on key down 'b'", () => {
      const { result } = setup();

      act(() => {
        result.current.keyDownHandlers.b();
      });

      expect(mockCoordinator.setZoomMode).toHaveBeenCalledWith("xy");
    });

    it("sets zoom mode to 'x' on key up 'v'", () => {
      const { result } = setup();

      act(() => {
        result.current.keyUphandlers.v();
      });

      expect(mockCoordinator.setZoomMode).toHaveBeenCalledWith("x");
    });

    it("sets zoom mode to 'x' on key up 'b'", () => {
      const { result } = setup();

      act(() => {
        result.current.keyUphandlers.b();
      });

      expect(mockCoordinator.setZoomMode).toHaveBeenCalledWith("x");
    });
  });
});
