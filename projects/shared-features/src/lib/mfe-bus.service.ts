import { DestroyRef, Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  RCS_CHANNEL,
  parseRcsMessage,
  type RcsMessage,
} from './contracts';

/**
 * The platform bus.
 *
 * `BroadcastChannel` is deliberately used instead of a shared singleton
 * service: it is a browser primitive, so the Shell and both microfrontends
 * can talk to each other without sharing a module instance, without a
 * framework-level dependency, and without any of them being able to reach
 * into another's object graph. Each side owns its own channel object.
 *
 * A separate `BroadcastChannel` instance never receives its own posts, which
 * is exactly the semantics we want: publishing is a request to everyone else.
 */
@Injectable({ providedIn: 'root' })
export class RcsBus {
  readonly #channel = new BroadcastChannel(RCS_CHANNEL.platform);
  readonly #messages = new Subject<RcsMessage>();

  /** Every structurally valid message seen on the channel. */
  readonly messages$: Observable<RcsMessage> = this.#messages.asObservable();

  constructor() {
    this.#channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = parseRcsMessage(event.data);
      if (message === null) {
        // A malformed or incompatible message must never break the receiver.
        console.warn('[rcs-bus] dropped incompatible message', event.data);
        return;
      }
      this.#messages.next(message);
    };

    inject(DestroyRef).onDestroy(() => {
      this.#channel.onmessage = null;
      this.#channel.close();
      this.#messages.complete();
    });
  }

  /** Narrowed stream for a single message type. */
  on<T extends RcsMessage['type']>(type: T): Observable<Extract<RcsMessage, { type: T }>> {
    return this.messages$.pipe(
      filter((message): message is Extract<RcsMessage, { type: T }> => message.type === type),
      map((message) => message),
    );
  }

  publish(message: RcsMessage): void {
    this.#channel.postMessage(message);
  }
}
