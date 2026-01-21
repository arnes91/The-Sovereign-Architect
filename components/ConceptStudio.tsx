
import React, { useState, useEffect } from 'react';
import { ImageGenerator } from './modules/studio/ImageGenerator';
import { ImageEditor } from './modules/studio/ImageEditor';
import { ContentAnalyzer } from './modules/studio/ContentAnalyzer';
import { Icon } from './modules/studio/Icon';

type Tool = 'image-gen' | 'image-edit' | 'analyze';

interface ConceptStudioProps {
    demoTrigger?: string;
}

const toolConfig = {
    'image-gen': { label: 'Image Generation', icon: 'image', component: ImageGenerator },
    'image-edit': { label: 'Image Editor', icon: 'edit', component: ImageEditor },
    'analyze': { label: 'Content Analyzer', icon: 'analyze', component: ContentAnalyzer },
};

const ConceptStudio: React.FC<ConceptStudioProps> = ({ demoTrigger }) => {
    const [activeTool, setActiveTool] = useState<Tool>('image-gen');

    const ActiveComponent = toolConfig[activeTool].component;

    // Pass demoTrigger down to the active component if it supports it
    // For this prototype, we'll assume ImageGenerator handles the demo
    const componentProps = activeTool === 'image-gen' ? { demoTrigger } : {};

    return (
        <div className="flex flex-col h-full p-6">
            <h1 className="text-4xl font-bold mb-2 text-indigo-400">Content Studio</h1>
            <p className="text-gray-400 mb-8">A collection of powerful Gemini-powered tools to fuel your creative projects.</p>
            
            <div className="flex border-b border-gray-700 mb-6">
                {Object.entries(toolConfig).map(([key, { label, icon }]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTool(key as Tool)}
                        className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTool === key
                                ? 'border-b-2 border-indigo-500 text-white'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Icon name={icon} className="w-5 h-5"/>
                        <span>{label}</span>
                    </button>
                ))}
            </div>
            
            <div className="flex-grow bg-gray-800 rounded-xl p-6 overflow-hidden">
                <ActiveComponent {...componentProps} />
            </div>
        </div>
    );
};

export default ConceptStudio;
