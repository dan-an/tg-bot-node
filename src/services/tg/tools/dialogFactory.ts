import { DialogConstructor, DialogInstance } from '@/types';

export class DialogFactory {
    private static registry: Record<string, DialogConstructor> = {};

    static registerDialog(name: string, dialogClass: DialogConstructor) {
        this.registry[name] = dialogClass;
    }

    static createDialog(name: string): DialogInstance | null {
        const DialogClass = this.registry[name];
        return DialogClass ? new DialogClass() : null;
    }

    static listDialogs(): string[] {
        return Object.keys(this.registry);
    }
}
