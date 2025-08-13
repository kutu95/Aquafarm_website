import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/locales/translations';

export default function LanguageToggle() {
  const { currentLanguage, changeLanguage, isEnglish, isGerman } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">
        {t('common.language', currentLanguage)}:
      </span>
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="en">🇺🇸 English</option>
        <option value="de">🇩🇪 Deutsch</option>
      </select>
    </div>
  );
}
