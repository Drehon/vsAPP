update doesn't reference the public repository from 1.3.9 to 1.4.0
this mean we need to FIRST fix 1.3.9
then publish 1.4.0 too
test 1.3.9 update to 1.4.0 publishing only to public
and start over if it fails

furthermore
npm run publish publishes directly to the public repo instead of the private one
correct process should be
npm run publish >>> to vsAPP
npm run publish-public >>>> copy release from vsAPP to vsAPP-public



