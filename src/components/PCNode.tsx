import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Monitor } from 'lucide-react';

export default memo(function PCNode({ data }: any) {
    const isHighlighted = data.isHighlighted;

    return (
        <div className={`bg-slate-700 border-[1px] ${isHighlighted ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'border-slate-500'} rounded p-2 flex flex-col items-center gap-1 hover:border-cyan-400 transition-colors cursor-pointer w-[80px]`}>

            <div className="relative w-full flex justify-center mt-[-16px]">
                {/* Invisible target handle positioned over the monitor icon top area */}
                <Handle
                    type="target"
                    id="pc-port"
                    position={Position.Top}
                    className="!w-3 !h-3 !bg-slate-400 border-none rounded-full top-[2px] z-10"
                />
            </div>

            <Monitor size={32} className={`mt-2 ${isHighlighted ? 'text-cyan-300' : 'text-slate-200'}`} />

            <span className={`text-xs truncate w-full text-center ${isHighlighted ? 'text-cyan-300' : 'text-slate-300'}`}>
                {data.label}
            </span>

            <div className="relative w-full flex justify-center mb-[-16px]">
                {/* Invisible source handle positioned over the monitor icon bottom area */}
                <Handle
                    type="source"
                    id="pc-port"
                    position={Position.Bottom}
                    className="!w-3 !h-3 !bg-slate-400 border-none rounded-full bottom-[2px] z-10"
                />
            </div>
        </div>
    );
});
