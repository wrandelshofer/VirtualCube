# VirtualCube
JavaScript applets with interactive Rubik's Cube-like puzzles.

The folder public_html/src contains the source files.
This folder can be published using a web-server for developping and debugging purposes.
However the content of this folder is not generally suited for use in the web, because the JavaScript code is
split up into many small files, which results in a lot of network traffic just for starting an applet.

The Ant script build-virtualcubes.xml can be used to create a distributable version of the code.
In the distributable version of the code, all JavaScript files are concatenated into a single file.

Running the default target of this script (which is the "all" target), generates the following files:

dist/virtualcubejs-x.x.x.zip 
dist/virtualcubejs-x.x.x-src.zip

where x.x.x is the version number. 