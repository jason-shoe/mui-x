import * as React from 'react';
import { rafThrottle } from '@mui/x-internals/rafThrottle';
import debounce from '@mui/utils/debounce';
import { ChartPlugin } from '../../models';
import { UseChartZoomSignature } from './useChartZoom.types';
import { useSelector } from '../../../store/useSelector';
import { selectorChartZoomOptionsLookup } from '../useChartCartesianAxis';
import { selectorChartDrawingArea } from '../../corePlugins/useChartDimensions/useChartDimensions.selectors';

interface ClampResult {
  start: number;
  end: number;
}

function clampZoomRange(start: number, end: number): ClampResult {
  let newStart = start;
  let newEnd = end;

  if (newEnd > 100) {
    newStart -= newEnd - 100;
    newEnd = 100;
  }

  if (newStart < 0) {
    newEnd -= newStart;
    newStart = 0;
  }

  return { start: newStart, end: newEnd };
}

const noSelectClass = 'mui-charts-no-select';

export const useChartZoom: ChartPlugin<UseChartZoomSignature> = ({ store, svgRef, params }) => {
  const throttledStoreUpdate = rafThrottle(store.update);
  const optionsLookup = useSelector(store, selectorChartZoomOptionsLookup);
  const drawingArea = useSelector(store, selectorChartDrawingArea);

  const [isPanning, setIsPanning] = React.useState(false);
  const [lastPanPosition, setLastPanPosition] = React.useState<{ x: number; y: number } | null>(
    null,
  );

  React.useEffect(() => {
    store.update((prev) => ({
      ...prev,
      zoom: {
        isInteracting: false,
        zoomData: params.zoomData ?? [],
      },
    }));
  }, [params.zoomData, store]);

  const debouncedUninteract = React.useMemo(
    () =>
      debounce(() => {
        store.update((prev) => {
          if (prev.zoom == null) {
            return prev;
          }

          return {
            ...prev,
            zoom: { ...prev.zoom, isInteracting: false },
          };
        });
      }, 200),
    [store],
  );

  const handlePan = React.useCallback(
    (event: MouseEvent) => {
      if (!isPanning || lastPanPosition == null) {
        return;
      }

      const svgElement = svgRef.current;
      if (svgElement == null) {
        return;
      }

      const { left, top, width, height } = svgElement.getBoundingClientRect();
      const x = (event.clientX - left) / width;
      const y = (event.clientY - top) / height;

      // Calculate the difference in position
      const dx = x - lastPanPosition.x;
      const dy = y - lastPanPosition.y;

      event.preventDefault();
      throttledStoreUpdate((prev) => {
        if (prev.zoom == null) {
          return prev;
        }
        debouncedUninteract();

        return {
          ...prev,
          zoom: {
            ...prev.zoom,
            isInteracting: true,
            zoomData: prev.zoom.zoomData.map((a) => {
              const axisWidthPct = a.end - a.start;
              const axis: 'x' | 'y' = optionsLookup[a.axisId]?.axisDirection ?? 'x';
              const diff = axis === 'x' ? dx : dy;

              // Calculate new positions based on the drag distance
              const newStartPct = a.start - diff * axisWidthPct;
              const newEndPct = a.end - diff * axisWidthPct;

              const clamped = clampZoomRange(newStartPct, newEndPct);
              return {
                ...a,
                start: clamped.start,
                end: clamped.end,
              };
            }),
          },
        };
      });

      setLastPanPosition({ x, y });
    },
    [debouncedUninteract, isPanning, lastPanPosition, optionsLookup, svgRef, throttledStoreUpdate],
  );

  const handleZoomOut = React.useCallback(
    (event: WheelEvent) => {
      const svgElement = svgRef.current;
      if (svgElement == null) {
        return;
      }

      const { left, top } = svgElement.getBoundingClientRect();

      const x = (event.clientX - left - drawingArea.left) / drawingArea.width;
      const y = (event.clientY - top - drawingArea.top) / drawingArea.height;
      // doesn't overlap with svg
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      throttledStoreUpdate((prev) => {
        if (prev.zoom == null) {
          return prev;
        }
        debouncedUninteract();

        return {
          ...prev,
          zoom: {
            ...prev.zoom,
            isInteracting: true,
            zoomData: prev.zoom.zoomData.map((a) => {
              const axisWidthPct = a.end - a.start;

              let newAxisWidthPct = axisWidthPct;
              if (event.deltaY < 0) {
                newAxisWidthPct = Math.max(axisWidthPct * 0.9, 0);
              } else {
                newAxisWidthPct = Math.min(axisWidthPct * 1.1, 100);
              }

              const axis: 'x' | 'y' = optionsLookup[a.axisId]?.axisDirection ?? 'x';
              const pct = axis === 'x' ? x : y;
              const middle = pct * (a.end - a.start) + a.start;

              const newStartPct = middle - newAxisWidthPct * pct;
              const newEndPct = middle + newAxisWidthPct * (1 - pct);

              const clamped = clampZoomRange(newStartPct, newEndPct);

              return {
                ...a,
                start: clamped.start,
                end: clamped.end,
              };
            }),
          },
        };
      });
    },
    [
      debouncedUninteract,
      drawingArea.height,
      drawingArea.left,
      drawingArea.top,
      drawingArea.width,
      optionsLookup,
      svgRef,
      throttledStoreUpdate,
    ],
  );

  React.useEffect(() => {
    const svgElement = svgRef.current;
    if (svgElement == null) {
      return undefined;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        // Left mouse button
        const { left, top, width, height } = svgElement.getBoundingClientRect();
        const x = (event.clientX - left) / width;
        const y = (event.clientY - top) / height;

        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
          event.preventDefault();
          setIsPanning(true);
          setLastPanPosition({ x, y });
        }
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setLastPanPosition(null);
    };

    svgElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handlePan);
    svgElement.addEventListener('wheel', handleZoomOut);

    // Add no-select class to prevent text selection
    svgElement.classList.add(noSelectClass);

    return () => {
      svgElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handlePan);
      svgElement.removeEventListener('wheel', handleZoomOut);
      // Remove no-select class when cleaning up
      svgElement.classList.remove(noSelectClass);
    };
  }, [handlePan, handleZoomOut, svgRef]);

  return {
    instance: {},
  };
};

useChartZoom.params = {
  zoomData: true,
};
