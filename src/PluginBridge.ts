import {FrameMessage, IFrameMessageProps} from "./FrameMessage";
const Parse = require('parse');

export interface PluginBridgeProps extends IFrameMessageProps {
    context?: any
}

export enum FetchMethod {
    // data: []
    Default = 'find',
    // data: {count: number, results: any[]}
    All = 'findAll',
    // Retrieves at most one Parse.Object that satisfies this query.
    // Returns the object if there is one, otherwise undefined.
    First = 'first',
    Count = 'count',
}

export enum EVENT_TYPES {
    // 创建一个message
    CREATE_ALERT = 'CREATE_ALERT',
    // 刷新插件执行上下文
    REFRESH_CONTEXT = 'REFRESH_CONTEXT',
    // 发起一个请求
    INVOKE = 'INVOKE',
}

class PluginBridge extends FrameMessage {
    public context: any;
    public Parse: any;
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
            this.postMessage('INVOKE', payload, resolve);
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
                context: this.context,
                messageId: messageId,
                contextId: this.context.__contextId__
            }
        })
    }

    postEventRequest(type: EVENT_TYPES, payload) {
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

    updateContext(contextMessage) {
        this.context = contextMessage.context;
        this.context.frame = contextMessage.frame;
        this.emitListener('updateContext', contextMessage);
    }

    async callBridge(type, {functionKey, payload}) {
        if (type === 'invoke') {
            return await this.postInvokeRequest({functionKey, payload})
        }
    }

    async query(query, method: FetchMethod) {
        return await this.postInvokeRequest({className: query.className, query: query.toJSON(), method})
    }

    async selfQuery(query, method: FetchMethod) {
        return await this.postInvokeRequest({className: query.className, query: query.toJSON(), method, isExternal: true})
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

    window.PluginBridge.contextUpdatedListener((data) => {
        const {PROXIMA_GATWAY, PROXIMA_APP_ID, sessionToken} = data.env;
        Parse.serverURL = `${PROXIMA_GATWAY}/parse`;
        Parse.initialize(PROXIMA_APP_ID);
        Parse.User.become(sessionToken);
        window.PluginBridge.Parse = Parse;
    })
})(window as FrameWindow & typeof globalThis);
