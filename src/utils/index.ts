/** Gnome libs imports */
import * as Clutter from 'clutter';
import * as GLib from 'glib';
const Main = imports.ui.main;

/** Extension imports */
const Me = imports.misc.extensionUtils.getCurrentExtension();

/* exported range, debounce, throttle, reparentActor */
export const range = (to: any) =>
    // Returns a list containing all integers from 0 to `to`
    Array(to)
        .fill(0)
        .map((_, i) => i);

// This signature cannot be specified in TypeScript, but it's ok because it wasn't used anyway
// export const debounce = function<T extends any[]>(fun: (...args: T, debounced_args: T[])=>void, delay: number) {
//     // Only calls once fun after no calls for more than delay
//     let timeout: number | null = null;
//     let debouncedArgs: T[] = [];
//     return function (...args: T) {
//         debouncedArgs.push(args);
//         const context: any = this;
//         if (timeout !== null) {
//             GLib.source_remove(timeout);
//         }
//         timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
//             fun.apply(context, [...args, debouncedArgs]);
//             timeout = null;
//             debouncedArgs = [];
//             return GLib.SOURCE_REMOVE;
//         });
//     };
// };

interface TrottleParams {
    trailing: boolean;
    leading: boolean;
}

// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
export function throttle<T extends any[], R>(
    func: (...args: T) => R,
    wait: number,
    options?: Partial<TrottleParams>
): (...args: T) => R {
    let context: any;
    let args, result: R;
    let timeout: number | null = null;
    let previous = 0;
    const definedOptions: TrottleParams = Object.assign(
        {
            trailing: true,
            leading: true,
        },
        options
    );

    const later = function () {
        previous = definedOptions.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
        return false;
    };
    return function (...args) {
        const now = Date.now();
        if (!previous && definedOptions.leading === false) previous = now;
        const remaining = wait - (now - previous);
        context = this;
        if (remaining <= 0 || remaining > wait) {
            if (timeout !== null) {
                GLib.source_remove(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && definedOptions.trailing !== false) {
            timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, remaining, later);
        }
        return result;
    };
}

export const isParentOfActor = (
    parent: Clutter.Actor,
    actor: Clutter.Actor
) => {
    if (!parent || !actor) {
        return false;
    }
    let isParent = false;
    let parentOfActor = actor;
    while (parentOfActor.get_parent() && !isParent) {
        isParent = parentOfActor === parent;
        parentOfActor = parentOfActor.get_parent();
    }
    return isParent;
};

export const reparentActor = (
    actor: Clutter.Actor | null,
    parent: Clutter.Actor | null
) => {
    if (!actor || !parent) return;
    Me.reparentInProgress = true;

    const restoreFocusTo = actor.has_key_focus()
        ? actor
        : isParentOfActor(actor, global.stage.key_focus)
        ? global.stage.key_focus
        : null;

    const currentParent = actor.get_parent();
    if (restoreFocusTo) {
        Main.layoutManager.uiGroup.grab_key_focus();
    }
    if (currentParent) {
        currentParent.remove_child(actor);
    }
    parent.add_child(actor);
    if (restoreFocusTo) {
        restoreFocusTo.grab_key_focus();
    }
    Me.reparentInProgress = false;
};

export const InfinityTo0 = (number: number) => {
    return Math.abs(number) === Infinity ? 0 : number;
};
