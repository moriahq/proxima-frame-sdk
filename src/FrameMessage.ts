export interface IFrameMessageProps {
    frameRef: Window;
    targetOrigin: string;
}

export enum EVENT_TYPES {
    // 更新页面当前的上下文
    UPDATE_CONTEXT = 'UPDATE_CONTEXT',
    // 返回异步请求的返回值
    ASYNC_REQUEST_RESOLVE = 'ASYNC_REQUEST_RESOLVE',
}

export type MessageDataType = {
    data: {
        type: EVENT_TYPES;
        payload: any;
        __message__: {
            contextId: number;
            messageId: number;
        };
    }
}

export class FrameMessage {
    private frameRef: Window;
    private readonly targetOrigin: string;

    constructor({frameRef, targetOrigin}: IFrameMessageProps) {
        this.frameRef = frameRef;
        this.targetOrigin = targetOrigin;
    }

    postMessage(payload) {
        this.frameRef.postMessage(payload, this.targetOrigin);
    }

    messageListener(callback) {
        window.addEventListener('message', callback, false);

        return () => {
            this.removeMessageListener(callback);
        };
    }

    removeMessageListener(callback) {
        window.removeEventListener('message', callback);
    }
}