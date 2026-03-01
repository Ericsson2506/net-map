import { memo } from 'react';
import { NodeResizer } from '@xyflow/react';
import { Layers } from 'lucide-react';

export default memo(function GroupNode({ data, selected }: any) {
    return (
        <>
            <NodeResizer
                color="#06b6d4"
                isVisible={selected}
                minWidth={150}
                minHeight={150}
                lineStyle={{ border: 'none' }}
                handleStyle={{ width: 8, height: 8, borderRadius: 4, pointerEvents: 'auto' }}
            />
            <div className="w-full h-full border-2 border-dashed border-cyan-500/40 bg-transparent rounded-xl relative group pointer-events-none">
                <div className="custom-drag-handle pointer-events-auto cursor-grab text-cyan-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity absolute top-[-2px] left-[-2px] bg-[#0f172a] px-3 py-1.5 rounded-tl-xl rounded-br-xl border-b-2 border-r-2 border-dashed border-cyan-500/40 z-10 shadow-[2px_2px_4px_rgba(0,0,0,0.2)]">
                    <Layers size={14} />
                    <span>{data.customName || data.label || 'Obszar'}</span>
                </div>
            </div>
        </>
    );
});
