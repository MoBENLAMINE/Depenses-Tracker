// ============================================================
// Hook des widgets de l'accueil (ordre + visibilité persistés)
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { SettingsRepository } from '../database/settings';
import {
  HOME_WIDGETS,
  DEFAULT_HOME_WIDGETS_ORDER,
  HOME_WIDGETS_ORDER_KEY,
  HOME_WIDGETS_HIDDEN_KEY,
  type HomeWidgetId,
} from '../utils/homeWidgets';

export function useHomeWidgets() {
  const { db } = useDatabase();
  const [order, setOrder] = useState<HomeWidgetId[]>(DEFAULT_HOME_WIDGETS_ORDER);
  const [hidden, setHidden] = useState<Set<HomeWidgetId>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const settings = new SettingsRepository(db);
    Promise.all([
      settings.getJSON<HomeWidgetId[]>(HOME_WIDGETS_ORDER_KEY, DEFAULT_HOME_WIDGETS_ORDER),
      settings.getJSON<HomeWidgetId[]>(HOME_WIDGETS_HIDDEN_KEY, []),
    ])
      .then(([savedOrder, savedHidden]) => {
        const known = new Set(HOME_WIDGETS.map((w) => w.id));
        const orderSet = new Set(savedOrder.filter((id): id is HomeWidgetId => known.has(id)));
        // Fusion : ordre sauvegardé puis widgets manquants à la suite (défaut)
        const mergedOrder = [
          ...orderSet,
          ...DEFAULT_HOME_WIDGETS_ORDER.filter((id) => !orderSet.has(id)),
        ];
        setOrder(mergedOrder);
        setHidden(new Set(savedHidden.filter((id): id is HomeWidgetId => known.has(id))));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [db]);

  const persistOrder = useCallback(
    async (newOrder: HomeWidgetId[]) => {
      setOrder(newOrder);
      if (db) await new SettingsRepository(db).setJSON(HOME_WIDGETS_ORDER_KEY, newOrder);
    },
    [db]
  );

  const setHiddenState = useCallback(
    async (id: HomeWidgetId, isHidden: boolean) => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (isHidden) next.add(id);
        else next.delete(id);
        if (db) {
          new SettingsRepository(db)
            .setJSON(HOME_WIDGETS_HIDDEN_KEY, [...next])
            .catch(() => {});
        }
        return next;
      });
    },
    [db]
  );

  const move = useCallback(
    (id: HomeWidgetId, dir: -1 | 1) => {
      setOrder((prev) => {
        const idx = prev.indexOf(id);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[target]] = [next[target], next[idx]];
        if (db) {
          new SettingsRepository(db).setJSON(HOME_WIDGETS_ORDER_KEY, next).catch(() => {});
        }
        return next;
      });
    },
    [db]
  );

  return { order, hidden, loading, persistOrder, setHidden: setHiddenState, move };
}
