export const remindersKeys = {
  all: ["reminders"] as const,
  today: (iso: string) => [...remindersKeys.all, iso] as const,
};
