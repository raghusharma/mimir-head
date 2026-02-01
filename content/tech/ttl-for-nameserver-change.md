---
title: What should you keep TTL for Nameserver Change
tags:
  - dns
status: good-enough
publish: "true"
---
1 of my colleagues asked me for advice on TTL changes for the DNS Nameserver changes & possibly a domain transfer. Here how the conversation went:

Him: What should I keep the TTL for DNS Nameservers transfer? Is 60s enough?
Me: You cannot control that.
Him: Can't control? Can you come on a call & explain what you mean?

I explained why changing the TTL of the records won't affect the DNS migration, as the NS servers of the domain reside in the .com nameservers (it was a .com domain).

Next morning, he asked me this:
I can see the nameservers TTL in the domain settings, and its editable. The value was 3600, and the TTL in the .com nameservers, as fetched by `dig +trace` was 172800.

This was confusing. What is this additional NS TTL for? On digging deeper, I found out the following:

The TTL that resides in your domain (3600 here) is the TTL that is returned when your domain's NS are consulted for the NS query. Whenever someone asks your nameservers for the NS records of the domain, this TTL (alongwith the NS name) is returned.
The question is, if the NS are already known (that is where the query is being sent), then why would they be consulted for NS in the first place?

Turns out that these are used in DNSSEC (which I don't fully understand at the moment), and to maintain the domain hygiene.

The best practice while changing the DNS Nameservers is to make changes in this entries as well. So the correct steps for changing the DNS Nameservers will be:

1. Copy (& verify) all the records in the new Nameservers
2. Change the NS entries (with 3600 TTL) in the old Nameservers to point to the new Nameservers. After this change, the old Nameservers, when asked about the NS record of the domain will return the newer Nameservers.
3. Update the Nameservers with the registrar, so that they are updated in the .com Nameservers (these have TTL 172800, and you don't have any control over them)
4. Now the Nameservers are transferred, and it will take upto 2 days (172800s) to propagate properly
5. Only after the .com NS TTL (172800) is expired, you can delete the old Nameservers (if they are in your control to delete)
6. Make sure to make minimum changes in this 2 days period(172800s). Or if you make any changes to a record, make sure to update in both places (Old & New Nameservers).
