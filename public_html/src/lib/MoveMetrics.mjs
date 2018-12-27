/* @(#)MoveMetrics.mjs  0.1  2011-08-12
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

// --------------
// Module imports
// --------------
import ScriptAST from './ScriptAST.mjs';
/**
 * Provides metrics for move sequences.
 * <p>
 * This class is designed to work with (but does not require) streams.
 * For example, you can compute move metrics for a stream with:
 * <pre>{@code
 * Stream<Node> nodeStream = ...;
 * MoveMetrics metrics = nodeStream.collect(MoveMetrics::new,
 *                                          MoveMetrics::accept,
 *                                          MoveMetrics::combine);
 * }</pre>
 */
class MoveMetrics {
    constructor() {
        /**
         * Current move node.
         */
        this.current = null;
        /**
         * Face Turn Metric without current node.
         */
        this.ftm = 0;
        /**
         * Quarter Turn Metric without current node.
         */
        this.qtm = 0;
        /**
         * Block Turn Metric without current node.
         */
        this.btm = 0;
        /**
         * Layer Turn Metric without current node.
         */
        this.ltm = 0;
        /**
         * Counts the number of no-op moves.
         * Includes the current node.
         */
        this.moveCount = 0;
    }

    accept(node) {
        // coalesce moves for counting
        for (let resolvedNode of node.resolvedIterable(false)) {
            if (!(resolvedNode instanceof ScriptAST.MoveNode)) {
                continue; // filter for move nodes
            }
            let moveNode = resolvedNode;
            let layerMask = moveNode.getLayerMask();
            let layerCount = moveNode.getLayerCount();
            let angle = moveNode.getAngle();
            let allLayers = (1 << layerCount) - 1;
            let axis = moveNode.getAxis();
            if (layerMask == 0 || angle == 0) {
                // skip nop, don't count
            } else if (this.current == null) {
                // cannot coalesce
                this.current = moveNode;
                this.moveCount++;
            } else if (this.current.getAxis() == axis && layerMask == allLayers) {
                // skip cube rotation over same axis
                this.moveCount++;
            } else if (this.current.getAxis() == axis && this.current.getLayerMask() == layerMask) {
                // coalesce subsequent move on same axis and same layer
                this.current = new MoveNode(layerCount, axis, layerMask, angle +this. current.getAngle(),
                  this.current.getStartPosition(), moveNode.getEndPosition());
                this.moveCount++;
            } else if (this.current.getAxis() == axis && this.current.getAngle() == angle && (this.current.getLayerMask() & layerMask) == 0) {
                // coalesce subsequent move on same axis and angle and different layers
                this.current = new MoveNode(layerCount, axis,this.current.getLayerMask()|layerMask, angle,
                        this.current.getStartPosition(), moveNode.getEndPosition());
                this.moveCount++;
            } else {
                // cannot coalesce
                if (this.isTwistMove(this.current)) {
                    this.addToTurnMetrics(this.current);
                }
                this.current = moveNode;
                this.moveCount++;
            }
        }
    }

    addToTurnMetrics(move) {
        this.ltm += this.countLayerTurns(move);
        this.qtm += this.countQuarterTurns(move);
        this.ftm += this.countFaceTurns(move);
        this.btm += this.countBlockTurns(move);
    }

    /**
     * Combines the state of another {@code MoveMetrics} into this
     * one.
     *
     * @param that another {@code MoveMetrics}
     * @throws NullPointerException if {@code other} is null
     */
    combine(that) {
        this.ltm += that.ltm;
        this.btm += that.btm;
        this.qtm += that.qtm;
        this.ftm += that.ftm;
        let tmpCount = this.moveCount;
        if (that.current != null) {
            this.accept(that.current);
        }
        this.moveCount = tmpCount + that.moveCount;
        return this;
    }

    /**
     * Gets the current layer turn count.
     */
    getLayerTurnCount() {
        return this.current == null ? this.ltm : this.ltm + this.countLayerTurns(this.current);
    }

    /**
     * Gets the current block turn count.
     */
    getBlockTurnCount() {
        return this.current == null ? this.btm : this.btm + this.countBlockTurns(this.current);
    }

    /**
     * Gets the current face turn count.
     */
    getFaceTurnCount() {
        return this.current == null ?this.ftm : this.ftm + this.countFaceTurns(this.current);
    }

    /**
     * Gets the current quarter turn count.
     */
    getQuarterTurnCount() {
        return this.current == null ? this.qtm : this.qtm + this.countQuarterTurns(this.current);
    }

    /**
     * Gets the number of moves.
     */
    getMoveCount() {
        return this.moveCount;
    }

    /**
     * Gets the layer turn count of the specified move node.
     */
    countLayerTurns(move) {
        let layerCount = move.getLayerCount();
        let layerMask = move.getLayerMask();
        let turns = Math.abs(move.getAngle()) % 4;
        if (turns == 0) {
            return 0;
        } else {
            let count = 0;
            for (let i = 0; i < layerCount; i++) {
                if (((layerMask >>> i) & 1) == 1) {
                    count++;
                }
            }
            return Math.min(count, layerCount - count);
        }
    }

    /**
     * Gets the block turn count of the specified move node.
     */
    countBlockTurns(move) {
        let layerCount = move.getLayerCount();
        let layerMask = move.getLayerMask();
        let turns = Math.abs(move.getAngle()) % 4;
        if (turns == 0) {
            return 0;
        } else {
            let previousTurnedLayer = 0;
            let countTurned = 0;
            let previousImmobileLayer = 1;
            let countImmobile = 0;
            for (let i = 0; i < layerCount; i++) {
                let currentLayer = (layerMask >>> i) & 1;
                if (currentLayer == 1 && currentLayer != previousTurnedLayer) {
                    countTurned++;
                }
                if (currentLayer == 0 && currentLayer != previousImmobileLayer) {
                    countImmobile++;
                }
                previousTurnedLayer = previousImmobileLayer = currentLayer;
            }
            return Math.min(countTurned, countImmobile);
        }
    }

    /**
     * Gets the face turn count of the specified node.
     */
    countFaceTurns(move) {
        let layerCount = move.getLayerCount();
        let layerMask = move.getLayerMask();
        let count = getBlockTurnCount(move);
        if (count != 0 && ((layerMask & (1 | (1 << (layerCount - 1)))) == 0
          || (layerMask & (1 | (1 << (layerCount - 1)))) == (1 | (1 << (layerCount - 1))))) {
            count++;
        }
        return count;
    }

    /**
     * Gets the face turn count of the specified node.
     */
    countQuarterTurns(move) {
        let qturns = Math.abs(move.getAngle() % 4);
        if (qturns == 3) {
            qturns = 1;
        }
        return this.countFaceTurns(move) * qturns;
    }

    /**
     * Returns true if the specified move twists layers.
     *
     * @param move a move
     * @return true if move twists layrser
     */
    isTwistMove(move) {
        let layerCount = move.getLayerCount();
        let  turns = Math.abs(move.getAngle()) % 4;
        let  allLayers = (1 << (layerCount)) - 1;
        let  layerMask = move.getLayerMask();
        return turns != 0 && layerMask != 0 && layerMask != allLayers;
    }

    toString() {
        return "MoveMetrics{" +
          "ftm=" + ftm +
          ", qtm=" + qtm +
          ", btm=" + btm +
          ", ltm=" + ltm +
          ", moves=" + moveCount +
          '}';
    }
}

/**
 * Gets the layer turn count of the subtree starting
 * at this node.
 */
function getLayerTurnCount(node) {
    let metrics = new MoveMetrics();
    metrics.accept(node);
    return metrics.getLayerTurnCount();
}

/**
 * Gets the block turn count of the subtree starting
 * at this node.
 */
function getBlockTurnCount(node) {
    let metrics = new MoveMetrics();
    metrics.accept(node);
    return metrics.getBlockTurnCount();
}

/**
 * Gets the face turn count of the subtree starting
 * at this node.
 */
function getFaceTurnCount(node) {
    let metrics = new MoveMetrics();
    metrics.accept(node);
    return metrics.getFaceTurnCount();
}

/**
 * Gets the quarter turn count of the subtree starting
 * at this node.
 */
function getQuarterTurnCount(node) {
    let metrics = new MoveMetrics();
    metrics.accept(node);
    return metrics.getQuarterTurnCount();
}

// ------------------
// MODULE API    
// ------------------
export default {
    MoveMetrics: MoveMetrics,
    getLayerTurnCount: getLayerTurnCount,
    getFaceTurnCount: getFaceTurnCount,
    getBlockTurnCount: getBlockTurnCount,
    getQuarterTurnCount: getQuarterTurnCount,
};
