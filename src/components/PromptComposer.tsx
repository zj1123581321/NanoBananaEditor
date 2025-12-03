import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { useAppStore, MODEL_CONFIG, ModelType } from '../store/useAppStore';
import { useImageGeneration, useImageEditing } from '../hooks/useImageGeneration';
import { useImagePaste, useImagePasteStatus } from '../hooks/useImagePaste';
import { useImageDrop } from '../hooks/useImageDrop';
import { useAuthInterceptor } from '../hooks/useAuthInterceptor';
import { Upload, Wand2, Edit3, MousePointer, HelpCircle, ChevronDown, ChevronRight, RotateCcw, Sparkles, Zap, Crown } from 'lucide-react';
import { blobToBase64 } from '../utils/imageUtils';
import { PromptHints } from './PromptHints';
import { PromptOptimizer } from './PromptOptimizer';
import { ImagePasteToast } from './ImagePasteToast';
import { LoginModal } from './LoginModal';
import { cn } from '../utils/cn';

export const PromptComposer: React.FC = () => {
  const { t } = useTranslation(['ui', 'common']);
  const {
    currentPrompt,
    setCurrentPrompt,
    selectedTool,
    setSelectedTool,
    temperature,
    setTemperature,
    seed,
    setSeed,
    isGenerating,
    uploadedImages,
    addUploadedImage,
    removeUploadedImage,
    clearUploadedImages,
    editReferenceImages,
    addEditReferenceImage,
    removeEditReferenceImage,
    clearEditReferenceImages,
    canvasImage,
    setCanvasImage,
    showPromptPanel,
    setShowPromptPanel,
    clearBrushStrokes,
    selectedModel,
    setSelectedModel,
  } = useAppStore();

  const { generate } = useImageGeneration();
  const { edit } = useImageEditing();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const [showPromptOptimizer, setShowPromptOptimizer] = useState(false);
  const [showProModelConfirm, setShowProModelConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取当前模型的最大参考图数量
  const maxReferenceImages = MODEL_CONFIG[selectedModel].maxReferenceImages;
  
  // 认证拦截器
  const { 
    showLoginModal, 
    setShowLoginModal, 
    executeWithAuth,
    checkAuthAndExecute
  } = useAuthInterceptor({
    actionName: '图片生成',
    onLoginRequired: () => {
      console.log('🍌 需要登录才能使用图片生成功能');
    }
  });
  
  // 图片粘贴功能
  const { status, showSuccess, showError, hide } = useImagePasteStatus();
  
  // 拖拽上传功能
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const { isDragOver } = useImageDrop({
    onImageDropped: handleImageAdded,
    onError: showError,
    enabled: true,
    targetElement: uploadAreaRef.current
  });

  // 统一的图片处理函数
  function handleImageAdded(imageData: { dataUrl: string }) {
    try {
      if (selectedTool === 'generate') {
        // Generate 模式不支持图片上传
        showError(t('ui:toast.imageUploadNotSupported'));
        return;
      } else if (selectedTool === 'edit') {
        if (editReferenceImages.length < maxReferenceImages) {
          addEditReferenceImage(imageData.dataUrl);
          showSuccess(t('ui:toast.stylePastedSuccess'));
        } else {
          showError(t('ui:toast.maxImagesReached'));
        }
        if (!canvasImage) {
          setCanvasImage(imageData.dataUrl);
        }
      } else if (selectedTool === 'mask') {
        clearUploadedImages();
        addUploadedImage(imageData.dataUrl);
        setCanvasImage(imageData.dataUrl);
        showSuccess(t('ui:toast.imagePastedSuccess'));
      }
    } catch {
      showError(t('ui:toast.imagePasteFailed'));
    }
  };
  
  useImagePaste({
    onImagePasted: handleImageAdded,
    onError: showError,
    enabled: true
  });

  // 实际执行生成/编辑的函数
  const executeGeneration = async () => {
    if (selectedTool === 'generate') {
      const referenceImages = uploadedImages
        .filter(img => img.includes('base64,'))
        .map(img => img.split('base64,')[1]);

      await generate({
        prompt: currentPrompt,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        temperature,
        seed: seed || undefined
      });
    } else if (selectedTool === 'edit' || selectedTool === 'mask') {
      await edit(currentPrompt);
    }
  };

  const handleGenerate = async () => {
    if (!currentPrompt.trim()) return;

    // 检查认证状态
    const actionName = selectedTool === 'generate' ? '图片生成' :
                      selectedTool === 'edit' ? '图片编辑' : '图片处理';

    const { canExecute } = await checkAuthAndExecute(async () => {}, actionName);

    if (!canExecute) {
      // 用户未登录，已经显示登录弹窗
      return;
    }

    // 如果选择了 Pro 模型，显示确认弹窗
    if (selectedModel === 'pro') {
      setShowProModelConfirm(true);
      return;
    }

    // Flash 模型直接执行
    await executeGeneration();
  };

  // Pro 模型确认后执行
  const handleProModelConfirm = async () => {
    setShowProModelConfirm(false);
    await executeGeneration();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await blobToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64}`;

        if (selectedTool === 'generate') {
          // Add to reference images (max based on model)
          if (uploadedImages.length < maxReferenceImages) {
            addUploadedImage(dataUrl);
          }
        } else if (selectedTool === 'edit') {
          // For edit mode, add to separate edit reference images (max based on model)
          if (editReferenceImages.length < maxReferenceImages) {
            addEditReferenceImage(dataUrl);
          }
          // Set as canvas image if none exists
          if (!canvasImage) {
            setCanvasImage(dataUrl);
          }
        } else if (selectedTool === 'mask') {
          // For mask mode, set as canvas image immediately
          clearUploadedImages();
          addUploadedImage(dataUrl);
          setCanvasImage(dataUrl);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    }
  };

  const handleClearSession = () => {
    setCurrentPrompt('');
    clearUploadedImages();
    clearEditReferenceImages();
    clearBrushStrokes();
    setCanvasImage(null);
    setSeed(null);
    setTemperature(0.7);
    setShowClearConfirm(false);
  };

  const tools = [
    { id: 'generate', icon: Wand2, label: t('ui:tools.generate'), description: t('ui:tools.descriptions.generate') },
    { id: 'edit', icon: Edit3, label: t('ui:tools.edit'), description: t('ui:tools.descriptions.edit') },
    { id: 'mask', icon: MousePointer, label: t('ui:tools.mask'), description: t('ui:tools.descriptions.mask') },
  ] as const;

  if (!showPromptPanel) {
    return (
      <div className="w-8 bg-gray-950 border-r border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowPromptPanel(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-r-lg border border-l-0 border-gray-700 flex items-center justify-center transition-colors group"
          title={t('ui:promptComposer.showPanel')}
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 lg:w-72 xl:w-80 h-full bg-gray-950 border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">{t('ui:promptComposer.mode')}</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHintsModal(true)}
              className="h-6 w-6"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPromptPanel(false)}
              className="h-6 w-6"
              title={t('ui:promptComposer.hidePanel')}
            >
              ×
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
                selectedTool === tool.id
                  ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              )}
            >
              <tool.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">{t('ui:model.title')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedModel('flash')}
            className={cn(
              'flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
              selectedModel === 'flash'
                ? 'bg-blue-400/10 border-blue-400/50 text-blue-400'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
            )}
          >
            <Zap className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{t('ui:model.flash.name')}</span>
            <span className="text-[10px] opacity-70">{t('ui:model.flash.description')}</span>
          </button>
          <button
            onClick={() => setSelectedModel('pro')}
            className={cn(
              'flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
              selectedModel === 'pro'
                ? 'bg-purple-400/10 border-purple-400/50 text-purple-400'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
            )}
          >
            <Crown className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{t('ui:model.pro.name')}</span>
            <span className="text-[10px] opacity-70">{t('ui:model.pro.description')}</span>
          </button>
        </div>
        {selectedTool === 'edit' && (
          <p className="text-xs text-gray-500 mt-2">
            {t('ui:model.maxRefImages', { count: maxReferenceImages })}
          </p>
        )}
      </div>

      {/* File Upload - Only show for edit and mask modes */}
      {selectedTool !== 'generate' && (
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1 block">
            {selectedTool === 'edit' ? t('ui:promptComposer.labels.styleReferences') : t('ui:promptComposer.labels.uploadImage')}
          </label>
          
          {selectedTool === 'mask' && (
            <p className="text-xs text-gray-400 mb-3">{t('ui:promptComposer.upload.editDescription')}</p>
          )}
          {selectedTool === 'edit' && (
            <p className="text-xs text-gray-500 mb-3">
              {canvasImage ? t('ui:promptComposer.upload.editStyleHint') : t('ui:promptComposer.upload.editUploadHint')}
            </p>
          )}

          {/* Upload Area with Drag & Drop */}
          <div
            ref={uploadAreaRef}
            className={cn(
              "relative border-2 border-dashed rounded-lg p-3 transition-all duration-200",
              isDragOver
                ? "border-purple-400 bg-purple-400/10"
                : "border-gray-600 hover:border-gray-500",
              (selectedTool === 'edit' && editReferenceImages.length >= maxReferenceImages) && "opacity-50 pointer-events-none"
            )}
          >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={selectedTool === 'edit' && editReferenceImages.length >= maxReferenceImages}
          />
          
          <div className="text-center">
            <Upload className={cn(
              "h-6 w-6 mx-auto mb-2 transition-colors",
              isDragOver ? "text-purple-400" : "text-gray-400"
            )} />
            
            <div className="space-y-1">
              <p className={cn(
                "text-sm font-medium transition-colors",
                isDragOver ? "text-purple-400" : "text-gray-300"
              )}>
                {isDragOver ? t('ui:promptComposer.upload.dropHere') : t('ui:promptComposer.upload.dragDrop')}
              </p>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
                disabled={selectedTool === 'edit' && editReferenceImages.length >= maxReferenceImages}
              >
                {t('ui:promptComposer.buttons.chooseFile')}
              </Button>
              
              <p className="text-xs text-gray-500 mt-1">
                {t('ui:promptComposer.upload.formats')}
              </p>
            </div>
          </div>

          {isDragOver && (
            <div className="absolute inset-0 bg-purple-400/10 border-2 border-purple-400 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-purple-400 font-medium mb-1">{t('ui:promptComposer.upload.releaseToUpload')}</div>
                <div className="text-xs text-purple-300">{t('ui:promptComposer.upload.willBeProcessed')}</div>
              </div>
            </div>
          )}
          </div>
          
          {/* Show uploaded images preview */}
          {selectedTool === 'edit' && editReferenceImages.length > 0 && (
            <div className="mt-3 space-y-2">
              {editReferenceImages.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Reference ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-gray-700"
                  />
                  <button
                    onClick={() => removeEditReferenceImage(index)}
                    className="absolute top-1 right-1 bg-gray-900/80 text-gray-400 hover:text-gray-200 rounded-full p-1 transition-colors"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-2 py-1 rounded text-gray-300">
                    {t('ui:promptComposer.upload.referenceLabel', { index: index + 1 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompt Input */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-3 block">
          {selectedTool === 'generate' ? t('ui:promptComposer.labels.describeCreate') : t('ui:promptComposer.labels.describeChanges')}
        </label>
        <Textarea
          value={currentPrompt}
          onChange={(e) => setCurrentPrompt(e.target.value)}
          placeholder={
            selectedTool === 'generate'
              ? t('ui:promptComposer.placeholders.generate')
              : t('ui:promptComposer.placeholders.edit')
          }
          className="min-h-[120px] resize-none"
        />
        
        <div className="mt-2 flex items-center justify-between">
          {/* Prompt Quality Indicator */}
          <button 
            onClick={() => setShowHintsModal(true)}
            className="flex items-center text-xs hover:text-gray-400 transition-colors group"
          >
            {currentPrompt.length < 20 ? (
              <HelpCircle className="h-3 w-3 mr-2 text-red-500 group-hover:text-red-400" />
            ) : (
              <div className={cn(
                'h-2 w-2 rounded-full mr-2',
                currentPrompt.length < 50 ? 'bg-yellow-500' : 'bg-green-500'
              )} />
            )}
            <span className="text-gray-500 group-hover:text-gray-400">
              {currentPrompt.length < 20 ? t('ui:promptComposer.quality.addDetail') :
               currentPrompt.length < 50 ? t('ui:promptComposer.quality.goodLevel') : t('ui:promptComposer.quality.excellentDetail')}
            </span>
          </button>
        </div>
      </div>

      {/* Prompt Optimizer Button */}
      <Button
        onClick={() => setShowPromptOptimizer(true)}
        disabled={!currentPrompt.trim()}
        variant="outline"
        className="w-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {t('ui:promptComposer.buttons.optimizePrompt')}
      </Button>


      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !currentPrompt.trim()}
        className="w-full h-14 text-base font-medium"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
            {t('common:states.generating')}
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            {selectedTool === 'generate' ? t('ui:promptComposer.buttons.generateImage') : t('ui:promptComposer.buttons.applyEdit')}
          </>
        )}
      </Button>

      {/* Advanced Controls */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
        >
          {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          {showAdvanced ? t('ui:promptComposer.advanced.hide') : t('ui:promptComposer.advanced.show')}
        </button>
        
        <button
          onClick={() => setShowClearConfirm(!showClearConfirm)}
          className="flex items-center text-sm text-gray-400 hover:text-red-400 transition-colors duration-200 mt-2"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('ui:promptComposer.advanced.clearSession')}
        </button>
        
        {showClearConfirm && (
          <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-300 mb-3">
              {t('ui:promptComposer.advanced.clearConfirm')}
            </p>
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearSession}
                className="flex-1"
              >
                {t('ui:promptComposer.advanced.yesClear')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1"
              >
                {t('common:actions.cancel')}
              </Button>
            </div>
          </div>
        )}
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Temperature */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                {t('ui:promptComposer.labels.creativity')} ({temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            {/* Seed */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                {t('ui:promptComposer.labels.seedOptional')}
              </label>
              <input
                type="number"
                value={seed || ''}
                onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('ui:promptComposer.placeholders.seedRandom')}
                className="w-full h-8 px-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className="pt-4 border-t border-gray-800">
        <h4 className="text-xs font-medium text-gray-400 mb-2">{t('ui:promptComposer.shortcuts.title')}</h4>
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>{t('ui:promptComposer.shortcuts.generate')}</span>
            <span>⌘ + Enter</span>
          </div>
          <div className="flex justify-between">
            <span>{t('ui:promptComposer.shortcuts.reroll')}</span>
            <span>⇧ + R</span>
          </div>
          <div className="flex justify-between">
            <span>{t('ui:promptComposer.shortcuts.editMode')}</span>
            <span>E</span>
          </div>
          <div className="flex justify-between">
            <span>{t('ui:promptComposer.shortcuts.history')}</span>
            <span>H</span>
          </div>
          <div className="flex justify-between">
            <span>{t('ui:promptComposer.shortcuts.togglePanel')}</span>
            <span>P</span>
          </div>
        </div>
      </div>
      </div>
      
      {/* Modals and Overlays */}
      <PromptHints open={showHintsModal} onOpenChange={setShowHintsModal} />
      
      {/* Prompt Optimizer Modal */}
      {showPromptOptimizer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <PromptOptimizer
              originalPrompt={currentPrompt}
              mode={selectedTool === 'generate' ? 'generate' : 'edit'}
              onOptimizedPrompt={(optimizedPrompt) => {
                setCurrentPrompt(optimizedPrompt);
                setShowPromptOptimizer(false);
              }}
              onClose={() => setShowPromptOptimizer(false)}
            />
          </div>
        </div>
      )}
      
      {/* Image Paste Toast */}
      <ImagePasteToast
        isVisible={status.isActive}
        message={status.message}
        type={status.type}
        onClose={hide}
      />
      
      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          console.log('🍌 登录成功，可以继续操作');
          setShowLoginModal(false);
        }}
        title="登录后继续"
        description={`请登录后使用${selectedTool === 'generate' ? '图片生成' : selectedTool === 'edit' ? '图片编辑' : '图片处理'}功能`}
      />

      {/* Pro Model Confirmation Modal */}
      {showProModelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Crown className="h-6 w-6 text-purple-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-100">
                {t('ui:model.confirmDialog.title')}
              </h3>
            </div>
            <p className="text-gray-300 mb-6">
              {t('ui:model.confirmDialog.message')}
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowProModelConfirm(false)}
                className="flex-1"
              >
                {t('ui:model.confirmDialog.cancel')}
              </Button>
              <Button
                onClick={handleProModelConfirm}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {t('ui:model.confirmDialog.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};