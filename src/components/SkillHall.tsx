import React from 'react';
import { SkillCenter, type SkillCenterTab } from './SkillCenter';

/** Thin wrapper — delegates to SkillCenter, the canonical skill hall component. */
export function SkillHall({ t, lang, initialTab }: { t: any; lang: 'en' | 'zh'; initialTab?: SkillCenterTab }) {
  return <SkillCenter t={t} lang={lang} initialTab={initialTab} />;
}
