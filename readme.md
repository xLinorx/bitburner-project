
# How to install and usage

## Installation


### Create the installer

Open [install.js](https://github.com/xLinorx/bitburner-project/blob/main/install.js) and copy its complete contents.

In the Bitburner terminal, create the file:

```bash
nano install.js
```

Replace the file contents with the copied installer, then save.


### Download the framework

Run the installer from the Bitburner terminal:

```bash
run install.js main
```

The installer downloads the project files from the `main` branch.


### Verify the installation

Confirm that `boot.js` exists on `home`. Then start the framework:

```bash
run boot.js
```

The repository must be public. The installer downloads files from GitHub.
{% endhint %}

## Update the System

Update the project files from the `main` branch:

```bash
run update.js main
```

Use the development branch only when needed:

```bash
run update.js dev
```


!!Updates can overwrite local changes to project files. Save custom changes before updating.!!


## Run the system

Start the framework from `home`:

```bash
run boot.js
```


!!`boot.js` can stop running processes before starting its subsystems. Review it before first use.!!


## Troubleshooting

* **`boot.js` is missing:** Run `run update.js main` again.
* **The update fails:** Check the branch name and repository access.
* **A subsystem does not start:** Check available RAM, Root access, and required APIs.
