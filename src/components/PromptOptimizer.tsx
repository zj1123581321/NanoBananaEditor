import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, Sparkles, CheckCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';
import { openaiService, PromptOptimizationRequest, PromptOptimizationResponse } from '../services/openaiService';
import { cn } from '../utils/cn';

interface PromptOptimizerProps {
  originalPrompt: string;
  mode: 'generate' | 'edit';
  style?: 'photorealistic' | 'illustration' | 'artistic' | 'product' | 'minimalist' | 'comic';
  onOptimizedPrompt: (optimizedPrompt: string) => void;
  onClose: () => void;
  className?: string;
}

export const PromptOptimizer: React.FC<PromptOptimizerProps> = ({
  originalPrompt,
  mode,
  style,
  onOptimizedPrompt,
  onClose,
  className
}) => {
  const { t } = useTranslation(['prompts', 'common', 'errors']);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<PromptOptimizationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>('');

  // 检查 OpenAI 服务是否可用
  const isServiceAvailable = openaiService.isAvailable();

  const handleOptimize = async () => {
    if (!originalPrompt.trim()) {
      setError(t('prompts:optimizer.enterPromptFirst'));
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setOptimization(null);

    try {
      const request: PromptOptimizationRequest = {
        originalPrompt,
        mode,
        style,
      };

      const response = await openaiService.optimizePrompt(request);
      setOptimization(response);
      setEditedPrompt(response.optimizedPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('prompts:optimizer.optimizationFailed'));
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApply = () => {
    const finalPrompt = editedPrompt || optimization?.optimizedPrompt || originalPrompt;
    onOptimizedPrompt(finalPrompt);
    onClose();
  };

  const handleReset = () => {
    setOptimization(null);
    setError(null);
    setEditedPrompt('');
  };

  if (!isServiceAvailable) {
    return (
      <div className={cn("bg-amber-50 border border-amber-200 rounded-lg p-4", className)}>
        <div className="flex items-center gap-2 text-amber-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{t('prompts:optimizer.configNotAvailable')}</p>
            <p className="text-sm text-amber-600 mt-1">
              {t('prompts:optimizer.configHint')}
            </p>
          </div>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onClose}
          className="mt-3"
        >
          {t('common:actions.close')}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700", className)}>
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('prompts:optimizer.title')}
            </h3>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </Button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('prompts:optimizer.subtitle')}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* 原始 Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('prompts:optimizer.originalPrompt')}
          </label>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 text-sm text-gray-800 dark:text-gray-200 border">
            {originalPrompt || t('prompts:optimizer.empty')}
          </div>
        </div>

        {/* 优化按钮 */}
        {!optimization && !error && (
          <div className="flex gap-2">
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !originalPrompt.trim()}
              className="flex-1"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('prompts:optimizer.optimizing')}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  {t('prompts:optimizer.optimizePrompt')}
                </>
              )}
            </Button>
            {(optimization || error) && (
              <Button
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="mt-2"
            >
              {t('prompts:optimizer.retry')}
            </Button>
          </div>
        )}

        {/* 优化结果 */}
        {optimization && (
          <div className="space-y-4">
            {/* 优化后的 Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('prompts:optimizer.optimizedPrompt')}
                <span className="text-xs text-green-600 ml-2 inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t('prompts:optimizer.optimized')}
                </span>
              </label>
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full h-32 p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder={t('prompts:optimizer.placeholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('prompts:optimizer.canEdit')}
              </p>
            </div>

            {/* 改进点 */}
            {optimization.improvements.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('prompts:optimizer.keyImprovements')}
                </label>
                <ul className="space-y-1">
                  {optimization.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 优化理由 */}
            {optimization.reasoning && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('prompts:optimizer.optimizationNotes')}
                </label>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {optimization.reasoning}
                  </p>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApply}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('prompts:optimizer.applyOptimization')}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('prompts:optimizer.reOptimize')}
              </Button>
            </div>
          </div>
        )}

        {/* 使用提示 */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 
                      border border-purple-200 dark:border-purple-800 rounded-md p-3">
          <p className="text-xs text-purple-800 dark:text-purple-200">
            💡 <strong>PS：</strong>{t('prompts:optimizer.tip')}
          </p>
        </div>
      </div>
    </div>
  );
};