import { useCallback, useRef, useState } from 'react';
import axios from 'axios';

interface Template {
  _id: string;
  body: string;
}

export function useTemplateNav({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  const [index, setIndex]       = useState<number | null>(null);
  const [total, setTotal]       = useState(0);
  const templatesRef            = useRef<Template[]>([]);
  const loadedRef               = useRef(false);

  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const res = await axios.get('/api/templates');
      templatesRef.current = res.data.templates;
      setTotal(res.data.templates.length);
    } catch { /* silent */ }
  }, []);

  const handleKeyNav = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      // Only intercept when box is empty OR currently cycling
      const empty   = value.trim() === '';
      const cycling = index !== null;
      if (!empty && !cycling) return;

      e.preventDefault();
      await ensureLoaded();

      const list = templatesRef.current;
      if (list.length === 0) return;

      const isUp = e.key === 'ArrowUp';

      setIndex((prev) => {
        let next: number;
        if (prev === null) {
          next = isUp ? list.length - 1 : 0;
        } else {
          next = isUp
            ? (prev - 1 + list.length) % list.length
            : (prev + 1) % list.length;
        }
        // Set value immediately using ref
        setValue(list[next].body);
        return next;
      });
    },
    [value, index, ensureLoaded, setValue]
  );

  // Reset index when user manually clears the box
  const handleChange = useCallback(
    (newVal: string) => {
      setValue(newVal);
      if (newVal.trim() === '') {
        // allow cycling again from scratch
      } else {
        // if typed manually (not matching any template), reset index
        const match = templatesRef.current.find((t) => t.body === newVal);
        if (!match) setIndex(null);
      }
    },
    [setValue]
  );

  return { handleKeyNav, handleChange, previewIndex: index, total };
}
