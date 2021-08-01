import {FrameMessage, IFrameMessageProps, MessageDataType, EVENT_TYPES} from "./FrameMessage.ts";

export interface IParentMessageProps extends IFrameMessageProps {
    frameRef: Window;
    targetOrigin: string;
    messageCallback: (message: MessageDataType['data']) => void;
    messageListener: () => void;
}

export class ParentMessage extends FrameMessage {
    private contextId: number;
    private readonly messageCallback: (message: MessageDataType["data"]) => void;

    constructor(props: IParentMessageProps) {
        super(props);
        this.messageCallback = props.messageCallback;
        this.messageListener(this.listenerCallback.bind(this))
    }

    async listenerCallback({data}: MessageDataType) {
        const {type, __message__} = data;

        if (type) {
            const contextId = __message__.contextId;
            const messageId = __message__.messageId;

            if (messageId && contextId === this.contextId) {
                this.messageCallback && this.messageCallback(data);
            }
        }
    }


    postMessageByCustomMessageId(messageType, payload, messageId) {
        super.postMessage({
            type: messageType,
            payload: payload,
            __messageId__: messageId
        })
    }

    // @ts-ignore
    postMessage(messageType: EVENT_TYPES, payload) {
        const messageId = this.generateMessageId();
        this.postMessageByCustomMessageId(messageType, payload, messageId)
    }

    generateMessageId() {
        return performance.now();
    }

    updatePluginContext(context) {
        const contextId = this.generateMessageId();
        this.contextId = contextId;

        this.postMessage(EVENT_TYPES.UPDATE_CONTEXT, {
            ...context,
            __contextId__: contextId,
        });
    }
}