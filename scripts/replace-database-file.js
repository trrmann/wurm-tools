import fs from 'node:fs';

export async function replaceDatabaseFile(temporary, destination) {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.promises.rename(temporary, destination);
      return;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 6) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}
