from rest_framework.permissions import BasePermission


class IsStaffMember(BasePermission):
    """Allow access only to users with a staff_profile (any role)."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'staff_profile')
        )


class IsAdminStaff(BasePermission):
    """Allow access only to staff users with admin role."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'staff_profile')
            and request.user.staff_profile.role == 'admin'
        )
