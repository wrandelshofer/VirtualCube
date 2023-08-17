# Icons
This folder contains the source files for the icons in the toolbar.

Icon files that start with `ic_` are taken from Google's Material Icons Library. 
They are licensed under the Apache 2.0 License.
https://github.com/google/material-design-icons

# How VirtualCube uses these icons
The VirtualCube applet does not use these icon files directly,
because reading each file over an internet connection would waste 
precious network bandwidth.

Instead, I have pasted the code of the icons into data urls inside
the file `virtualcube.css` in the `styles` folder.
