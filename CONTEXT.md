# Mirrman

Mirrman describes a repository transfer from a public source platform into a user-controlled Gitea target.

## Language

**Source Platform**:
A public repository host from which Mirrman can read and transfer repositories. GitHub and GitLab always mean their public deployments.
_Avoid_: Provider, source service

**Source Repository**:
The public or private Git repository selected for transfer from a Source Platform or a generic Git address.
_Avoid_: Upstream project

**Gitea Target**:
The user-configured private Gitea instance that receives a Source Repository.
_Avoid_: Destination platform, target provider

**Migration Intent**:
The complete request to transfer one Source Repository into a Gitea Target, including destination identity and content preferences.
_Avoid_: Payload, migration options

**Page Action**:
An optional source-page interaction that starts a Migration Intent without copying the repository URL manually.
_Avoid_: Injected button, content-script action

**Mirror**:
A transferred repository configured to continue synchronizing from its Source Repository.
_Avoid_: Migration

**Migration**:
A one-time repository transfer that does not continue synchronizing from its Source Repository.
_Avoid_: Mirror
