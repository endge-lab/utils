# engine2d/utils

> shared utilities

## Subscription contract

`Subscribable` и `SubscribableLike` переэкспортируются из `@typedworks/federation`. Это те же definitions, от которых наследуется общий `EndgeModule`; отдельной реализации подписок в Utils нет.


## Distribution boundary

The existing root import keeps the same public exports and runtime identities.
Serialization is emitted as one owner chunk, so production bundlers can omit
its metadata initialization when only EventBus, createInstance or randomString
are used. Serialization/decorator consumers retain Reflect initialization.
No new runtime helper, dependency or public subpath is introduced.

After building, run `node src/test/distribution/package-consumer.mjs` to verify
helper and serialization imports in isolated production bundles and fresh realms.
