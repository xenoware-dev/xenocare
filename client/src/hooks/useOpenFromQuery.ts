import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

/** Opens a page's "create" dialog when the URL has ?new=1 (used by the top bar's New menu). */
export function useOpenFromQuery(open: () => void, enabled = true) {
  const [params, setParams] = useSearchParams();
  const wantsNew = params.get('new') === '1';

  useEffect(() => {
    if (!wantsNew || !enabled) return;
    open();
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [wantsNew, enabled, open, params, setParams]);
}
