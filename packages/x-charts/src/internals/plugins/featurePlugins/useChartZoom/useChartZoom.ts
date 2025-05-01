import * as React from 'react';
import { rafThrottle } from '@mui/x-internals/rafThrottle';
import debounce from '@mui/utils/debounce';
import { ChartPlugin } from '../../models';
import { UseChartZoomSignature } from './useChartZoom.types';
import { useSelector } from '../../../store/useSelector';
import { selectorChartZoomOptionsLookup } from '../useChartCartesianAxis';

export const useChartZoom: ChartPlugin<UseChartZoomSignature> = ({ store, svgRef, params }) => {
  const throttledStoreUpdate = rafThrottle(store.update);
  const optionsLookup = useSelector(store, selectorChartZoomOptionsLookup);

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

  const handleZoomOut = React.useCallback(
    (event: WheelEvent) => {
      const svgElement = svgRef.current;
      if (svgElement == null) {
        return;
      }

      const { left, top, width, height } = svgElement.getBoundingClientRect();

      const x = (event.clientX - left) / width;
      const y = (event.clientY - top) / height;
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
              const middle = (axis === 'x' ? x : y) * axisWidthPct + a.start;

              let newStartPct = middle - newAxisWidthPct / 2;
              let newEndPct = middle + newAxisWidthPct / 2;

              if (newEndPct > 100) {
                newStartPct -= newEndPct - 100;
                newEndPct = 100;
              }

              if (newStartPct < 0) {
                newEndPct += newStartPct;
                newStartPct = 0;
              }

              return {
                ...a,
                start: newStartPct,
                end: newEndPct,
              };
            }),
          },
        };
      });
    },
    [debouncedUninteract, optionsLookup, svgRef, throttledStoreUpdate],
  );

  React.useEffect(() => {
    const callback = (event: WheelEvent) => {
      handleZoomOut(event);
    };
    const svgElement = svgRef.current;
    if (svgElement == null) {
      return undefined;
    }

    svgElement.addEventListener('wheel', callback);
    return () => {
      svgElement.removeEventListener('wheel', callback);
    };
  }, [handleZoomOut, svgRef]);

  return {
    instance: {},
  };
};

useChartZoom.params = {
  zoomData: true,
};
