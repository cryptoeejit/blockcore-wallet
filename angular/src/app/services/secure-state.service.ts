import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
/** Secure state service that holds the master keys in a key/value list of wallet ID and base64 encoded master key. */
export class SecureStateService {
    // The background.ts is responsible for clearing the secure state when timeout is reached.

    /** Contains the master seed for unlocked wallets. This object should never be persisted and only exists in memory. */
    private keys: Map<string, string>;

    unlockedWalletsSubject: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);

    get unlockedWallets$(): Observable<string[]> {
        return this.unlockedWalletsSubject.asObservable();
    }

    constructor() {
        const storage = globalThis.chrome.storage as any;

        // Each instance of extension need this listener when session is cleared.
        storage.session.onChanged.addListener(async (changes: any) => {
            // console.log("storage.session.onChanged:");
            // console.log(changes);
            await this.load();

            // Update the unlocked wallet subject with only the keys (wallet IDs).
            this.unlockedWalletsSubject.next(<string[]>Array.from(this.keys.keys()));
        });
    }

    async set(key: string, value: string) {
        if (globalThis.chrome && globalThis.chrome.storage) {
            const storage = globalThis.chrome.storage as any;

            // Update the keys, then persist it.
            this.keys.set(key, value);

            // This will trigger an onChange event and reload the same keys. This will happens twice
            // in the instance that called set, but only once for other instances of the extension.
            await storage.session.set({ 'keys': Object.fromEntries(this.keys.entries()) });

            // Every time a new key is set, we'll update the active value as well.
            await globalThis.chrome.storage.local.set({ 'active': new Date().toJSON() });
        }
    }

    get(key: string) {
        return this.keys.get(key);
    }

    async load() {
        if (globalThis.chrome && globalThis.chrome.storage) {
            const storage = globalThis.chrome.storage as any;

            let { keys } = await storage.session.get(['keys']);

            if (keys != null && Object.keys(keys).length > 0) {
                this.keys = new Map<string, string>(Object.entries(keys))
            } else {
                this.keys = new Map<string, string>();
            }
        }
    }
}
