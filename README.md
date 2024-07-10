# BEAR (BPMN Environmental AnimatoR)

## Description

Modern business processes are heavily influenced by the physical environment in which they act. Participants occupy a position and move in the environment, and their activities and choices can depend on and influence its state. BPMN is a widely used standard for representing multi-party business processes in terms of collaboration diagrams, providing clear and expressive notation. However, BPMN and its extensions lack support for integrating the physical environment. To overcome this issue we provide a novel model animator tool, called BEAR, developed to support designers in achieving a more precise understanding of the interplay between collaboration process control flow and the environment. 

## Installation

### Manual installation

To install BEAR, follow these steps:

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Run `npm run start` to start a [local instance](http://localhost:8080).

### Docker installation

To install BEAR, follow these steps:

1. Run `docker pull proslab/bear` to install the Docker image.
2. Run `docker run -p 8080:8080 proslab/bear` to start a [local instance](http://localhost:8080).

## **Modeling with BEAR**

BEAR embeds a user-friendly modeler capable of representing environmental BPMN collaborations.  
The modeler is divided into two parts: 

*   **BPMN modeler** (on the left) used to design the BPMN collaboration processes
*   **Environment modeler** (on the right) used to design the environment in the form of place graphs

On the left of each modeler, BEAR shows an **element palette** used to design the two models. For each element of the two modelers is possible to define additional property using the **property panel.  
**For each place of the environmental model, the property panel is used to set one or more **environmental attributes**. To define them, it is necessary to define the name of the attribute and its value `Attribute: Alarm and Value: false`. 
  
For each **pool**, it is possible to set a **position** corresponding to one of the places of the environmental model.  
For each **task**, we add three new properties:

*   **Guard** constrains the execution of a task to an environmental status. The guard expression has to be defined putting at the beginning the name of the attribute that constraints the activity and the value that activates the condition (`p4.attr==free`)
*   **Destination** indicate the place the participant want to reach from its current position. The destination has to be defined by selecting one place from the environmental model.
*   **Assignments** are used to modify the environment topology (by adding or deleting a node or place) or the value of its attributes and data objects. The assignments have to be defined by writing the name of the attribute that has to be changed and the new associated value.  
    With the assignments, it is also possible to delete or add new places and edges of the environmental model by using the corresponding keywords `connect(p4.p5)` and `disconnect(p4.5)`

For each **conditional event** (start and boundary), we add the property **condition** used to activate the event. The property must be a boolean expression over data object and place attributes. Es. `p1.attr & do.attr == true`  
For each **message event** is possible to set some properties: 

*  **Send Message Events** is possible to define the payload of the message which can contain a value refered to a data object, or a place. 
*  **Receive Message Events** is possible to set the name of the attribute to associate the payload of the corresponding send message event.

Es. If we want to comunicate that the position with fire is in the place1 we have to write in the sending message `Payload:place1` and in the receive message `Attribute Name:firePosition`.

It is also possible to use the attribute name of the receive message event as a general name to define the destination of tasks Es. `Destination:firePosition`, which automatically use as destination the place defined in the payload `place1`.
The attribute name of the receive message event can be also used as general name to define the guard or to make an assignment in the task. In this case the attribute has to be write with the symbol $. Es. `Guard:$firePosition.fire==true` or `Assignment Attribute1:$firePosition.fire; Value1: false`. 

It is also possible to refer to an environmental attribute related to two or more places in the environment, using the keyword PLACES. Es.`Guard: PLACES.fire==false` controls that every place which has the attribute fire, the value is set to false. 

BEAR makes it possible to save the project (**Save** button) and to upload an existing environmental BPMN collaboration model by clicking on the **_Open_** button and choosing a .zip file containing the .bpmn file and the space .xml file.

## **Animation with BEAR**

BEAR embeds an animator capable of representing step-by-step the environmental BPMN collaboration execution. By selecting the Token Simulation button in the BEAR interface, a play button will appear over each fireable start event. Once this button is clicked, one process is activated. This creates a new token in the form of a small colored circle at the start event of the BPMN collaboration and another token in place of the environmental model corresponding to the set position of the pool, which starts to cross the two models.
  
The animation terminates once all tokens cannot move forward.  
In case a token remains blocked due to environmental conditions, e.g. a guard condition violation, BEAR highlights it in red.  
  
The **data panel** in the BEAR interface keeps track value evolution of the values related to data objects and environmental attributes during the animation. At any time, the animation can be paused by the user to check the distribution of tokens in the environment and into the BPMN collaboration.

### License

This project is licensed under the [MIT License](LICENSE).

