export PRUN=1
export TARGET=msgBackAndForth
echo PRUN=$PRUN
echo TARGET=$TARGET

# In another window dmesg -Hw
# sudo insmod rpmsg_client_sample.ko
# sudo insmod rpmsg_pru.ko
sudo chmod 666 /dev/rpmsg_pru30 /dev/rpmsg_pru31

# sudo rmmod rpmsg_client_sample.ko
# sudo rmmod rpmsg_pru.ko
