#!/bin/sh
# From: https://gist.github.com/jadonk/0e4a190fc01dc5723d1f183737af1d83

# Connect the display before running this.

sudo bash << EOF
    # remove the framebuffer modules
    rmmod --force fb_ili9341
    rmmod --force fbtft
    rmmod --force fbtft_device

    # unexport poins 49 and 57 so the framebuffer can use them
    echo 49 > /sys/class/gpio/unexport # RESET - V14 - GP0_PIN4
    echo 57 > /sys/class/gpio/unexport # D/C - U16 - GP0_PIN3
    echo 29 > /sys/class/gpio/unexport # CS - H18
        
    # Set the pinmuxes for the display
    echo gpio > /sys/devices/platform/ocp/ocp\:P9_23_pinmux/state # RESET - V14 - GP0_4
    echo gpio > /sys/devices/platform/ocp/ocp\:U16_pinmux/state # D/C - U16 - GP0_3
    echo spi > /sys/devices/platform/ocp/ocp\:P9_31_pinmux/state # SCLK - A13 - S1.1_5
    echo spi > /sys/devices/platform/ocp/ocp\:P9_29_pinmux/state # MISO - B13 - S1.1_4
    echo spi > /sys/devices/platform/ocp/ocp\:P9_30_pinmux/state # MOSI - D12 - S1.1_3
    echo spi > /sys/devices/platform/ocp/ocp\:H18_pinmux/state # CS - H18 - S1.1_6
    sleep 2
    
    # Insert the framebuffer modules
    modprobe fbtft_device name=adafruit28 busnum=1 rotate=270 gpios=reset:49,dc:57
EOF

# 
export FRAMEBUFFER=/dev/fb0

# Display an image
fbi -noverbose -T 1 -a tux.png
# Cycle between several images
fbi -t 5 -blend 1000 -noverbose -T 1 -a Matthias.jpg Malachi.jpg Alan.jpg Louis.jpg

# Play a movie
SDL_VIDEODRIVER=fbcon 
SDL_FBDEV=/dev/fb0
mplayer -vf-add rotate=2 -framedrop hst_1.mpg

# Look at the framebuffer settings
fbset