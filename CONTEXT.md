# Codex Image Generation Context

This glossary defines the model concepts used in the Codex subscription image-generation capability. It exists to prevent the shared word “model” from collapsing distinct user choices.

## Language

**Codex chat-model selection**: The model choice for the Codex conversation that requests the image capability.
_Avoid_: Image model, carrier (these are related but distinct concepts).

**Responses carrier**: The Codex conversation model that carries an image-generation request; it is not the engine that creates the image.
_Avoid_: Image model.

**Image model**: The model choice that generates or edits the image requested through the Codex capability.
_Avoid_: Chat model, carrier.

**Image quality**: A generation-quality tier that affects the requested image result without selecting a different chat or image model.
_Avoid_: Model, image model.
