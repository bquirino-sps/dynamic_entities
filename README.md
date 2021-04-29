# Dynamic entities LAPI

## Commands

Importat the flags **--copy** and **--debug** are opcionals, to usethem you need to remove the brackets []**

Include the --copy argument if you want to update the existing set of values. Exclude it if you want to replace the current set.

To output debug messages, include the --debug argument.

For more information check this [link](https://docs.oracle.com/en/cloud/paas/digital-assistant/rest-api-oci/use-case-dynamic-entities.html)

```
node index.js -s <skill name> -v <skill version> -e <entity name> -d <absolute pathname of request body JSON file> -c <absolute pathname of configuration JSON file> [--copy] [--debug]

node index.js -s oda_resultados_compose_dev -v 1.0.2 -e ESTUDIOS -d C:/<path>/examplePatchData.json -c C:/<path>/exampleConfig.json --copy

node index.js -s oda_resultados_compose_dev -v 1.0.2 -e ESTUDIOS -d 'C:/Users/erodriguez/OneDrive - SPS (1)/Desktop/githubs/DynamicEntityNodeWrapper/examplePatchData.json' -c 'C:/Users/erodriguez/OneDrive - SPS (1)/Desktop/githubs/DynamicEntityNodeWrapper/exampleConfig.json' --copy
```