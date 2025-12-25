import { useEffect, useState } from 'react';

import { DBConnection, openDatabase } from '@/src/db/db';

export function useDatabase() {
  const [db, setDb] = useState<DBConnection | null>(null);

  useEffect(() => {
    let isMounted = true;
    openDatabase().then((conn) => {
      if (isMounted) {
        setDb(conn);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return db;
}
