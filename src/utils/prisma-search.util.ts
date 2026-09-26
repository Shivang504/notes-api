export const buildSearchFilter = (
  search: string | undefined,
  fields: string[],
) => {
  if (!search) return {};

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: search,
        mode: 'insensitive',
      },
    })),
  };
};