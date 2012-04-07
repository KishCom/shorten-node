#!/bin/bash

#generate some known good hashes to test against:
# mysql -u user -ppassword -e "SELECT linkHash FROM shorten_linkmaps ORDER BY RAND() LIMIT 50" shorten_node | sed "s/'/\'/;s/\t/\",\"/g;s/^/\"/;s/$/\"/;s/\"linkHash\"//g"
goodHashes=( "we9ys8" "o6scx9" "26g8v2" "o272eo" "54ob2u" "g4f7du" "3nbwbu" "q202d4" "vglgu3" "b1r1iq" "4zb1u7" "mqw4y1" "v884k5" "82j27o" "3ars3s" "jdpby1" "0i029x" "fxpho6" "6e8q10" "l45p57" "goghm5" "hi4k0z" "z94em6" "ghp21u" "94q24c" "p497p9" "x1te82" "wsc32t" "5d0eaf" "5kgjq5" "if2ca3" "4457vw" "n1957z" "6o99vb" "pg16ad" "tra782" "942vb7" "3motas" "6f1k8f" "zi0k0q" "68we84" "rbv28w" "5w60go" "w2207u" "z94em6" "esvug7" "rz0g7p" "018jot" "88s09q" "mg9021" "7v2haf" "25hm3t" "l3c7rc" "p311hc" "o6c439" "tygohq" "p33317" "v97in2" "uttd75" "68w9u0" "xn4239" "frl6pm" "h736t0" "q6dxso" "546j38" "vglgu3" "3134ct" "744n22" )
for i in "${goodHashes[@]}"
do
   :
   node test-migration.js $i
   sleep 1.1;
done
