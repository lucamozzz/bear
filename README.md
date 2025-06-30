# Environment-aware BPMN Animator

<span style="color:red;font-weight:750;">

NOTE FOR REVIEWERS:
You can find several case studies in [the following repository](https://bitbucket.org/proslabteam/environmental-bpmn-collaboration-models/src/main/BEAR2.0/2025). Each .zip file includes both a BPMN collaboration model and its corresponding environment model. These .zip files can be downloaded and directly uploaded into the tool—ready for animation—by clicking the Open button in the top-right corner.

</span>

Business processes, in particular collaborations, describe how various participants interact and behave to achieve specific objectives.
Depending on the business scenario, process participants operate in a specific environment characterized by spatial and contextual dimensions.
Participants can interact with and modify the environment, which in turn may influence process execution.
Indeed, there exists a bidirectional relationship between business processes and the environment, which involves the necessity of representing the environment in a way that allows business processes to benefit from its awareness.
Despite extensive research on environment modeling, the seamless integration of business processes and the environment model is not fully explored yet.
To address this gap, we propose a tool for animating environment-aware BPMN collaborations with the aid of geographical maps (see figure below).

![Environment-aware BPMN Animator GUI](./images/ui2.png)

## Installation
### Manual installation

To install the tool, follow these steps:

1. Run `npm install` to install the dependencies.
2. Run `npm run start` to start a [local instance](http://localhost:8080).

## Case studies
BEAR makes it possible to upload an environment-aware BPMN collaboration model by clicking on the ***Open*** button.
When uploading a model, a `.zip` file containing the `.bpmn` file and the space `.json` file will have to be provided by the user.
By clicking on the ***Examples*** button, you will be redirected to the [following repository](https://bitbucket.org/proslabteam/environmental-bpmn-collaboration-models/src/main/BEAR2.0/2025), where you will find `.zip` files of varioues case studies ranging different scenariox. 
Each case study is available in a fully functional variant and others with intentional modeling errors to showcase the tool’s capabilities, following the same naming convention:
- `case_study.zip` <span style="color:green;">(happy path)</span>
- `case_study_different.zip`  <span style="color:#FFDE21;">(different positions)</span>
- `case_study_unreachable.zip`  <span style="color:#FFDE21;">(unreachable destination)</span>
- `case_study_discordant.zip`  <span style="color:red;">(discordant movements)</span>

## License

A detailed user guide, screenshots and a tool demonstration video are avilable at the [following website](https://pros.unicam.it/environmental-bpmn/).

## License

Environment-aware BPMN Animator © 2025 is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/?ref=chooser-v1) 
