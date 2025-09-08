import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { HelpCircle, Languages } from 'lucide-react';
import { InfoModal } from './InfoModal';
import { useAppStore } from '../store/useAppStore';

export const Header: React.FC = () => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { t, i18n } = useTranslation('ui');
  const { currentLanguage, setCurrentLanguage } = useAppStore();
  
  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'zh' : 'en';
    setCurrentLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <>
      <header className="h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🍌</div>
            <h1 className="text-xl font-semibold text-gray-100 hidden md:block">
              {t('header.title')}
            </h1>
            <h1 className="text-xl font-semibold text-gray-100 md:hidden">
              {t('header.titleShort')}
            </h1>
          </div>
          <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            1.0
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleLanguage}
            title={`Switch to ${currentLanguage === 'en' ? '中文' : 'English'}`}
          >
            <Languages className="h-5 w-5" />
          </Button>
          
          {/* <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowInfoModal(true)}
          >
            <HelpCircle className="h-5 w-5" />
          </Button> */}
        </div>
      </header>
      
      <InfoModal open={showInfoModal} onOpenChange={setShowInfoModal} />
    </>
  );
};