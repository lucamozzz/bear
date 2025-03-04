# BEAR (BPMN Environmental AnimatoR)

## Description

Modern business processes are heavily influenced by the physical environment in which they act. Participants occupy a position and move in the environment, and their activities and choices can depend on and influence its state. BPMN is a widely used standard for representing multi-party business processes in terms of collaboration diagrams, providing clear and expressive notation. However, BPMN and its extensions lack support for integrating the physical environment. To overcome this issue we provide a novel model animator tool, called BEAR, developed to support designers in achieving a more precise understanding of the interplay between collaboration process control flow and the environment. 

## Installation

### Manual installation

To install BEAR, follow these steps:

1. Download the repository.
2. Run `npm install` to install the dependencies.
3. Run `npm run start` to start a [local instance](http://localhost:8080).

### Docker installation

To install BEAR, follow these steps:

1. Run `docker build -t bear .` to build the Docker image.
2. Run `docker run -p 8080:8080 bear` to start a [local instance](http://localhost:8080).

## **Modeling with BEAR**

BEAR embeds a user-friendly modeler capable of representing environmental BPMN collaborations.  
The modeler is divided into two parts: 

*   **BPMN modeler** (on the left) used to design the BPMN collaboration processes
*   **Environment modeler** (on the right) used to design the environment in the form of place graphs

On the left of each modeler, BEAR shows an **element palette** used to design the two models. 
For each element in the modelers, it is possible to define additional properties using the property panel. One or more **environmental attributes** can be set for a place in the environmental model by using the associated property panel. In order to define an environmental attribute, it is necessary to define its name and its initial value. Environmental attributes can be referenced by other elements in the models by using the following notation: `place_name.attribute_name`. Other attributes can be defined by using data objects in the BPMN modeler, which will only be accessible by the elements that belong to that specific pool, using the `attribute_name` notation.

An **initial position** corresponding to one of the places in the environmental model can be set for each **pool**, which represents participant in the collaboration.

**Tasks** in the model will include three new properties:

*   **Guard** constrains the execution of a task to an environmental status. The guard expression has to be defined by specifying the name of a defined attribute and the value that activates the condition (e.g., `place_name.attribute_name == value`).
*   **Destination** indicates the place that the participant wants to reach from its current position. The destination has to be defined by selecting one of the places defined in the environmental model or by specifying the name of an attribute that contains the name of a place.
*   **Assignments** are used to modify the environment topology (by connecting or disconnecting places) and the value of its attributes. Assignments are defined by specifying the name of a defined attribute and its new value. To connect or disconnect places in the environmental model, it is possible to use the `connect` and `disconnect` keywords as attributes and dot separated pairs of places (e.g., `place1.place2`) as the values to be assigned.

For both start and boundary **conditional events**, the **condition** property can be used to activate the event. The condition must be a boolean expression over data object (e.g., `attribute_name == value`) or place attributes (e.g., `place_name.attribute_name == value`).

For a **message event** it is possible to set some properties: 

* **Send Message Events** may define a message payload, which can contain an attribute or any other arbitrary value, such as numbers and text.
* **Receive Message Events** will in turn specify the name of the attribute to associate with the payload of the corresponding send message event.


Attributes which contain the name of a place can be used in guards by using `$` sign followed by the name of the attribute. For example, if the value of `attribute1` is `place1`, writing `$attribute1.attribute_name == value` is the same as writing `place1.attribute_name == value`. The same approach can also be used for assignments.

Moreover, it is possible to refer to an environmental attribute related to more places by using the `PLACES` keyword. For example, using the `PLACES.attribute_name == value` expression as a guard, will return `true` if least one place will have 'attribute_name' set to `value`, `false` otherwise. When using this approach for performing assignments, the name of the first place that has `attribute_name` set to `value` will be returned, `null` otherwise.

BEAR makes it possible to save an environmental BPMN collaboration model by clicking on the ***Save*** button and to upload one by clicking on the **_Open_** button. When uploading a model, a .zip file containing the .bpmn file and the space .xml file will have to be provided by the user.

## **Animation with BEAR**

BEAR embeds an animator capable of representing step-by-step the environmental BPMN collaboration execution. By selecting the Token Simulation button in the BEAR interface, a play button will appear over each fireable start event. Once this button is clicked, one process is activated. This creates a new token in the form of a small colored circle at the start event of the BPMN collaboration and another token in place of the environmental model corresponding to the set position of the pool, which starts to cross the two models.
  
The animation terminates once all tokens cannot move forward. In the case of a token remaining blocked due to environmental conditions (e.g., a guard condition violation) BEAR will highlight the issue using the red color.  

The **data panel** in the top-right corner of the BEAR interface allows users to keep track of the evolution of the values related to data objects and environmental attributes throughout the animation. At any time, the animation can be paused by the user to check the distribution of the tokens in the environment and in the BPMN collaboration.

### License

This project is licensed under the [MIT License](LICENSE).

