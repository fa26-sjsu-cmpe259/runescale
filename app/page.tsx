import type { ReactElement } from 'react';
import { MONSTERS } from '@/lib/data/monsters';
import { WarTable } from '@/components/war-table/WarTable';
import type { MonsterOption } from '@/components/war-table/types';

export default function Home(): ReactElement {
  // Only what the picker needs crosses to the client; full stat blocks stay on the server.
  const monsters: MonsterOption[] = MONSTERS.map((m) => ({ name: m.name, cr: m.cr, type: m.type, size: m.size }));
  return <WarTable monsters={monsters} />;
}
