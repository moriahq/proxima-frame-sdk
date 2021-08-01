import {FrameMessage, IFrameMessageProps} from "./FrameMessage";

const Parse = require('parse');

export interface PluginBridgeProps extends IFrameMessageProps {
    context?: any
}

class PluginBridge extends FrameMessage {
    public context: any;
    private readonly listeners: { updateContext: any[] };
    private readonly requestIds: {};

    constructor({frameRef, targetOrigin, context}: PluginBridgeProps) {
        super({frameRef, targetOrigin});
        this.context = context;
        this.listeners = {
            updateContext: []
        };
        this.requestIds = {};

        this.messageListener(({data}) => {
            if (data.type) {
                if (data.type === 'UPDATE_CONTEXT') {
                    this.updateContext(data.payload)
                } else if (this.requestIds[data.__messageId__]) {
                    this.requestIds[data.__messageId__](data);
                    delete this.requestIds[data.__messageId__];
                }
            }
        });
    }

    postInvokeRequest(payload) {
        return new Promise((resolve) => {
            const messageId = performance.now();
            this.requestIds[messageId] = resolve;
            this.postMessage('INVOKE', payload, messageId);
        })
    }

    generateMessageId() {
        return performance.now();
    }

    // @ts-ignore
    postMessage(messageType, payload, callBack) {
        const messageId = this.generateMessageId();
        this.requestIds[messageId] = callBack;

        super.postMessage({
            type: messageType,
            payload: payload,
            __message__: {
                messageId: messageId,
                contextId: this.context.__contextId__
            }
        })
    }

    postEventRequest(type, payload) {
        return new Promise((resolve) => {
            this.postMessage(type, payload, resolve);
        })
    }

    addListener(type, callback) {
        if (this.listeners[type]) {
            this.listeners[type].push(callback)
        }
    }

    contextUpdatedListener(callback) {
        this.addListener('updateContext', callback)
    }

    emitListener(type, props) {
        const listeners = this.listeners[type];
        for (let i = 0; i < listeners.length; i++) {
            listeners[i](props)
        }
    }

    updateContext(context) {
        this.context = context;
        this.emitListener('updateContext', context);
    }

    async callBridge(type, {functionKey, payload}) {
        if (type === 'invoke') {
            return await this.postInvokeRequest({functionKey, payload})
        }
    }
}

interface FrameWindow extends Window {
    PluginBridge: PluginBridge;
}

(function (window) {
    window.PluginBridge = new PluginBridge({
        frameRef: window.parent,
        targetOrigin: '*',
        context: {}
    });
    const {PROXIMA_GATWAY, appId, sessionToken} = window.PluginBridge.context;
    Parse.serverURL = `${PROXIMA_GATWAY}/parse`;
    Parse.initialize(appId);
    Parse.User.become(sessionToken)
})(window as FrameWindow & typeof globalThis);
