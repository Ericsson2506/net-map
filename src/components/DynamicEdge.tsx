import { memo } from 'react';
import { BaseEdge, getBezierPath, Position, type EdgeProps } from '@xyflow/react';

export default memo(function DynamicEdge(props: EdgeProps & { className?: string }) {
    const { sourceX, sourceY, targetX, targetY, style, markerEnd, id, interactionWidth } = props;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    let sourcePos = props.sourcePosition || Position.Bottom;
    let targetPos = props.targetPosition || Position.Top;

    if (Math.abs(dx) > Math.abs(dy)) {
        sourcePos = dx > 0 ? Position.Right : Position.Left;
        targetPos = dx > 0 ? Position.Left : Position.Right;
    } else {
        sourcePos = dy > 0 ? Position.Bottom : Position.Top;
        targetPos = dy > 0 ? Position.Top : Position.Bottom;
    }

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition: sourcePos,
        targetX,
        targetY,
        targetPosition: targetPos,
    });

    return (
        <BaseEdge
            id={id}
            path={edgePath}
            markerEnd={markerEnd}
            style={style}
            interactionWidth={interactionWidth}
            className={props.className}
        />
    );
});
