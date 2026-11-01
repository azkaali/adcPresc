import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Medicine, MedicineInput } from '../../shared/types.ts';
import { api } from '../api';
import { buildIndex, type IndexedMedicine } from './search';

interface MedicinesContextValue {
  medicines: Medicine[];
  index: IndexedMedicine[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  save: (input: MedicineInput, id?: number) => Promise<Medicine>;
  remove: (id: number) => Promise<void>;
}

const MedicinesContext = createContext<MedicinesContextValue | null>(null);

const byBrand = (a: Medicine, b: Medicine) =>
  a.brand_name.localeCompare(b.brand_name, undefined, { sensitivity: 'base' }) || a.strength.localeCompare(b.strength);

/** Loads the whole medicine list once so searching never waits on the network. */
export function MedicinesProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setMedicines(await api.medicines.list());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (input: MedicineInput, id?: number) => {
    const saved = id ? await api.medicines.update(id, input) : await api.medicines.create(input);
    setMedicines((list) => [...list.filter((m) => m.id !== saved.id), saved].sort(byBrand));
    return saved;
  }, []);

  const remove = useCallback(async (id: number) => {
    await api.medicines.remove(id);
    setMedicines((list) => list.filter((m) => m.id !== id));
  }, []);

  const index = useMemo(() => buildIndex(medicines), [medicines]);
  const value = useMemo(
    () => ({ medicines, index, loading, error, reload, save, remove }),
    [medicines, index, loading, error, reload, save, remove],
  );

  return <MedicinesContext.Provider value={value}>{children}</MedicinesContext.Provider>;
}

export function useMedicines(): MedicinesContextValue {
  const value = useContext(MedicinesContext);
  if (!value) throw new Error('useMedicines must be used inside MedicinesProvider');
  return value;
}
