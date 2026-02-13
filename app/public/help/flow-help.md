# Go Flow

This is a tool that helps create stories, plots, quests, and other narratives.

## Warning

Our tool is in the early stages of development; some functionality may be limited, and you might encounter bugs.

# What can you do now?

- Create a narrative and export it to JSON format for development, for example, for a game.
- Create a narrative and export it to HTML format for sharing and publication.
- The use cases are not limited to these, and we are constantly adding new functionality.

# How do I create a narrative?

## Very simple

- Currently, the narrative is built from left to right as a graph of objects and connections between them.
- You have a canvas where you can place objects and make connections between them.
- The canvas can be scaled, and you can freely navigate it using a mouse or touchpad.

### Navigation

Occurs **using two-finger gestures on a touchpad** or by **moving the mouse while holding down the right mouse button**.

### Scaling

Occurs **via two-finger pinch gestures on a touchpad** or **with the mouse wheel**.

### Tools and Objects

On the left panel, there are tools for creating narratives; let's look at the main ones.

#### Selection Tool

- This is a standard tool that allows you to manipulate objects on the canvas.
- It can always be activated by pressing the **ESC** key.

#### Narrative Node

This is an object that contains a name and narrative text.

#### Choice Node

This is an object containing choice-based narrative text, allowing, for example, the player to directly influence the narrative's development; this node enables branching in your narrative.

#### Layer

- This is an object on the canvas and simultaneously a container for objects; you can think of it as a "canvas within a canvas."
- A layer also contains a name and can include a description.
- You can enter a layer and create a narrative within it; for example, layers can be entire chapters of your story or individual branches.
- The narrative within a layer can be connected to the narrative of a higher-level layer.

##### Layer Start and End Nodes

- If there are nodes within a layer without connected incoming or outgoing links, such nodes are added to the list of start and end nodes of the layer, respectively.
  - Such nodes will be displayed in the layer object and will be available for connecting links on a higher-level layer.

##### Layers and Objects Panel

- Also, when a layer is created, it appears in the objects panel.
- The objects panel can be opened by clicking the button on the layer navigation panel, located in the bottom left corner.
- The objects panel reflects the layer hierarchy of your project and allows you to navigate between layers.

### Connections Between Objects

- Almost every object on the canvas has incoming and outgoing connections that you can link as desired.
- It's important to understand that at this stage, the narrative can only start from one "point"—the first node of the graph, which acts as a parent for all other objects and connections.
- Connections support auto-linking when moving nodes with free connection pins, as well as when creating new nodes via the dialog during node editing.
- Connections also support semi-automatic linking: you just need to click on the connection pin of one node and then click on the pin of the second node.

## Advanced Narrative

- You can also create advanced narratives using indirect branching (without player choices).
- The following will help you with this:
  - Variables;
  - Conditions on connections;
  - Operations with variables in nodes.

### Variables

- On the right panel, there is a section with variables that are active in the project.
- Variables will help create all types of conditions and will also participate in operations.
- For example, you can create a variable: "money" and assign it an initial value; then, conditions on connections and operations with variables in nodes come into play.

### Operations with Variables in Nodes

- But how do we "get money"?
- Operations with variables in narrative nodes will help us here.
- Operations do not need a special condition to trigger, as all conditions for the player reaching a node with operations are stored on the connections.
- Therefore, by selecting the desired node, we can create operations within it that manipulate the value of our "money" variable.
  - For example, in one node, we can create an operation to subtract "money."
  - And in another node, an operation to receive money.

### Conditions on Connections

- Conditions for traversal can be created on almost all connections, except for direct single connections from one narrative node to another.
  - It's like a guard who checks whether you can pass or not, and if not, you'll have to go another way.
- In the example with the variable above, we created the "money" variable and changed its value.
  - Now we can create a condition on the desired connection that will check how much money we have for the connection to activate.
  - Otherwise, it won't let us pass, and the story will go in a different direction.
- Conditions and their combinations on connections have a priority, but to put it simply, connections with conditions are checked first.

### Experiments

- Variables, operations, and conditions are the key to a complex story and advanced non-linearity.
- Therefore, don't be afraid to experiment and explore different approaches.
- Because you can always test your story.

# Can I test the narrative I created?

- Of course! In the top right corner, there is a button that will launch your created narrative, starting from the first node.
  - Alternatively, you can start the story from a desired narrative node so you don't have to begin the playthrough from scratch every time.
- Currently, the narrative on the canvas must still start from a single node (have the beginning of its graph), but there can be multiple endings.

# How do I export my project?

In the top left corner, next to your project's name, there is a menu through which you can export your project to the desired format.
